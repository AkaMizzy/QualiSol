import { OfflineRecord, OfflineRecordData } from "@/types/offlineTypes";
import * as Crypto from "expo-crypto";
// Use legacy API for compatibility with expo-image-picker URIs
import * as FileSystem from "expo-file-system/legacy";
import { getDatabase } from "./database";

const OFFLINE_IMAGES_DIR = `${FileSystem.documentDirectory}offline_images/`;

/**
 * Ensure offline images directory exists
 */
async function ensureOfflineImagesDirExists(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(OFFLINE_IMAGES_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(OFFLINE_IMAGES_DIR, {
        intermediates: true,
      });
      console.log("[OfflineStorage] Created offline images directory");
    }
  } catch (error) {
    console.error("[OfflineStorage] Failed to create directory:", error);
    throw error;
  }
}

/**
 * Save an image from temporary URI to persistent local storage
 * @param imageUri - Temporary image URI (e.g., from camera or picker)
 * @returns Permanent local file path
 */
export async function saveImageLocally(imageUri: string): Promise<string> {
  await ensureOfflineImagesDirExists();

  const uuid = Crypto.randomUUID();
  const timestamp = Date.now();
  const extension = imageUri.split(".").pop() || "jpg";
  const fileName = `${uuid}_${timestamp}.${extension}`;
  const localPath = `${OFFLINE_IMAGES_DIR}${fileName}`;

  try {
    await FileSystem.copyAsync({
      from: imageUri,
      to: localPath,
    });
    console.log("[OfflineStorage] Image copied to:", localPath);
    return localPath;
  } catch (error) {
    console.error("[OfflineStorage] Failed to copy image:", error);
    throw error;
  }
}

/**
 * Save a voice note from temporary URI to persistent local storage
 * @param voiceNoteUri - Temporary voice note URI
 * @returns Permanent local file path
 */
export async function saveVoiceNoteLocally(
  voiceNoteUri: string,
): Promise<string> {
  await ensureOfflineImagesDirExists();

  const uuid = Crypto.randomUUID();
  const timestamp = Date.now();
  const extension = voiceNoteUri.split(".").pop() || "m4a";
  const fileName = `voice_${uuid}_${timestamp}.${extension}`;
  const localPath = `${OFFLINE_IMAGES_DIR}${fileName}`;

  try {
    await FileSystem.copyAsync({
      from: voiceNoteUri,
      to: localPath,
    });
    console.log("[OfflineStorage] Voice note copied to:", localPath);
    return localPath;
  } catch (error) {
    console.error("[OfflineStorage] Failed to copy voice note:", error);
    throw error;
  }
}

/**
 * Create an offline record and add to sync queue
 * @param data - Record data including image URI
 * @returns Client-generated record ID
 * Note: Not available on web platform
 */
export async function createOfflineRecord(
  data: OfflineRecordData,
): Promise<string> {
  // Offline storage not available on web
  if (require("react-native").Platform.OS === "web") {
    throw new Error("Offline storage is not available on web platform");
  }

  try {
    console.log("[OfflineStorage] Starting createOfflineRecord...");
    console.log(
      "[OfflineStorage] documentDirectory:",
      FileSystem.documentDirectory,
    );

    const db = await getDatabase();
    if (!db) {
      throw new Error("Database not available");
    }
    console.log("[OfflineStorage] Database initialized");

    const recordId = Crypto.randomUUID();
    const createdAt = new Date().toISOString();

    console.log("[OfflineStorage] Generated record ID:", recordId);

    // Save image locally
    console.log("[OfflineStorage] Saving image locally from:", data.imageUri);
    const localImagePath = await saveImageLocally(data.imageUri);
    console.log("[OfflineStorage] Image saved to:", localImagePath);

    // Save voice note locally if provided
    let localVoiceNotePath: string | null = null;
    if (data.voiceNoteUri) {
      console.log("[OfflineStorage] Saving voice note locally");
      localVoiceNotePath = await saveVoiceNoteLocally(data.voiceNoteUri);
      console.log("[OfflineStorage] Voice note saved to:", localVoiceNotePath);
    }

    console.log("[OfflineStorage] Inserting record into database...");
    // Insert offline record
    await db.runAsync(
      `INSERT INTO offline_records (
        id, idsource, title, description, kind, author,
        idauthor, iddevice, chantier, audiotxt, iatxt,
        latitude, longitude, altitude, accuracy, altitudeAccuracy, level, type, categorie, mode,
        local_image_path, local_voice_note_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        data.idsource,
        data.title,
        data.description || null,
        data.kind,
        data.author,
        data.idauthor || null,
        data.iddevice || null,
        data.chantier || null,
        data.audiotxt || null,
        data.iatxt || null,
        data.latitude || null,
        data.longitude || null,
        data.altitude || null,
        data.accuracy || null,
        data.altitudeAccuracy || null,
        data.level ?? null,
        data.type || null,
        data.categorie || null,
        data.mode || null,
        localImagePath,
        localVoiceNotePath,
        createdAt,
      ],
    );
    console.log("[OfflineStorage] Record inserted successfully");

    // Insert sync queue entry
    console.log("[OfflineStorage] Adding to sync queue...");
    await db.runAsync(
      `INSERT INTO sync_queue (record_id, status, retry_count)
       VALUES (?, 'pending', 0)`,
      [recordId],
    );
    console.log("[OfflineStorage] Sync queue entry added");

    console.log(
      `[OfflineStorage] Offline record created successfully: ${recordId}`,
    );
    return recordId;
  } catch (error) {
    console.error("[OfflineStorage] Failed to create offline record:", error);
    console.error(
      "[OfflineStorage] Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
    throw error;
  }
}

/**
 * Get offline records with optional limit
 * @param limit - Maximum number of records to return
 * @returns Array of offline records with sync status (empty on web)
 */
export async function getOfflineRecords(
  limit?: number,
): Promise<OfflineRecord[]> {
  // Offline storage not available on web
  if (require("react-native").Platform.OS === "web") {
    return [];
  }

  try {
    console.log("[OfflineStorage] Getting offline records, limit:", limit);
    const db = await getDatabase();
    if (!db) {
      return [];
    }

    const sql = `
      SELECT 
        r.*,
        sq.status as sync_status,
        sq.retry_count
      FROM offline_records r
      LEFT JOIN sync_queue sq ON r.id = sq.record_id
      ORDER BY r.created_at DESC
      ${limit ? `LIMIT ${limit}` : ""}
    `;

    const result = await db.getAllAsync(sql);
    console.log("[OfflineStorage] Retrieved", result.length, "offline records");

    const mapped = result.map((row: any) => ({
      id: row.id,
      idsource: row.idsource,
      title: row.title,
      description: row.description,
      kind: row.kind,
      author: row.author,
      idauthor: row.idauthor,
      iddevice: row.iddevice,
      chantier: row.chantier,
      audiotxt: row.audiotxt,
      iatxt: row.iatxt,
      latitude: row.latitude,
      longitude: row.longitude,
      altitude: row.altitude,
      accuracy: row.accuracy,
      altitudeAccuracy: row.altitudeAccuracy,
      level: row.level,
      type: row.type,
      categorie: row.categorie,
      mode: row.mode,
      local_image_path: row.local_image_path,
      local_voice_note_path: row.local_voice_note_path,
      created_at: row.created_at,
      sync_status: (row.sync_status as any) || "pending",
      retry_count: row.retry_count || 0,
    }));

    return mapped;
  } catch (error) {
    console.error("[OfflineStorage] Failed to get offline records:", error);
    console.error(
      "[OfflineStorage] Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
    // Return empty array instead of throwing to prevent app crash
    return [];
  }
}

/**
 * Get pending records from sync queue
 * @returns Array of offline records that need to be synced
 */
export async function getPendingSyncRecords(): Promise<OfflineRecord[]> {
  try {
    console.log("[OfflineStorage] Getting pending sync records...");
    const db = await getDatabase();
    console.log("[OfflineStorage] Database ready for pending records query");

    const result = await db.getAllAsync(
      `SELECT 
        r.*,
        sq.status as sync_status,
        sq.retry_count
      FROM offline_records r
      INNER JOIN sync_queue sq ON r.id = sq.record_id
      WHERE sq.status IN ('pending', 'failed')
      ORDER BY r.created_at ASC`,
    );

    console.log("[OfflineStorage] Retrieved", result.length, "pending records");

    return result.map((row: any) => ({
      id: row.id,
      idsource: row.idsource,
      title: row.title,
      description: row.description,
      kind: row.kind,
      author: row.author,
      idauthor: row.idauthor,
      iddevice: row.iddevice,
      chantier: row.chantier,
      audiotxt: row.audiotxt,
      iatxt: row.iatxt,
      latitude: row.latitude,
      longitude: row.longitude,
      altitude: row.altitude,
      accuracy: row.accuracy,
      altitudeAccuracy: row.altitudeAccuracy,
      level: row.level,
      type: row.type,
      categorie: row.categorie,
      mode: row.mode,
      local_image_path: row.local_image_path,
      local_voice_note_path: row.local_voice_note_path,
      created_at: row.created_at,
      sync_status: row.sync_status as any,
      retry_count: row.retry_count || 0,
    }));
  } catch (error) {
    console.error(
      "[OfflineStorage] Failed to get pending sync records:",
      error,
    );
    console.error(
      "[OfflineStorage] Error details:",
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
    // Return empty array to prevent sync service from crashing
    return [];
  }
}

/**
 * Update sync queue status for a record
 * @param recordId - Record ID
 * @param status - New sync status
 * @param errorMessage - Optional error message if failed
 */
export async function updateSyncStatus(
  recordId: string,
  status: "syncing" | "completed" | "failed",
  errorMessage?: string,
): Promise<void> {
  const db = await getDatabase();
  const timestamp = new Date().toISOString();

  try {
    await db.runAsync(
      `UPDATE sync_queue
       SET status = ?,
           last_attempt_at = ?,
           error_message = ?,
           retry_count = CASE WHEN ? = 'failed' THEN retry_count + 1 ELSE retry_count END
       WHERE record_id = ?`,
      [status, timestamp, errorMessage || null, status, recordId],
    );
    console.log(`Sync status updated for ${recordId}: ${status}`);
  } catch (error) {
    console.error("Error confirming sync:", error);
    throw error;
  }
}

export const deleteOfflineRecord = async (id: string): Promise<void> => {
  try {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM offline_records WHERE id = ?", [id]);
    console.log("Deleted offline record:", id);
  } catch (error) {
    console.error("Error deleting offline record:", error);
    throw error;
  }
};

/**
 * Delete an offline record and its local files
 * @param recordId - Record ID to delete
 */
export async function deleteOfflineRecordAndFiles(
  recordId: string,
): Promise<void> {
  const db = await getDatabase();

  try {
    // First, get the record to find file paths
    const records = await db.getAllAsync(
      "SELECT * FROM offline_records WHERE id = ?",
      [recordId],
    );

    if (records.length === 0) {
      console.warn(`Record ${recordId} not found`);
      return;
    }

    const record = records[0];

    // Delete local image file
    try {
      const imageInfo = await FileSystem.getInfoAsync(record.local_image_path);
      if (imageInfo.exists) {
        await FileSystem.deleteAsync(record.local_image_path);
      }
    } catch (error) {
      console.error("Failed to delete local image:", error);
    }

    // Delete local voice note file if exists
    if (record.local_voice_note_path) {
      try {
        const voiceNoteInfo = await FileSystem.getInfoAsync(
          record.local_voice_note_path,
        );
        if (voiceNoteInfo.exists) {
          await FileSystem.deleteAsync(record.local_voice_note_path);
        }
      } catch (error) {
        console.error("Failed to delete local voice note:", error);
      }
    }

    // Delete from sync_queue first
    await db.runAsync("DELETE FROM sync_queue WHERE record_id = ?", [recordId]);

    // Then delete from offline_records
    await db.runAsync("DELETE FROM offline_records WHERE id = ?", [recordId]);

    console.log(`Offline record deleted: ${recordId}`);
  } catch (error) {
    console.error("Failed to delete offline record:", error);
    throw error;
  }
}
