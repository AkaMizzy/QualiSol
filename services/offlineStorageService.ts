import { OfflineRecord, OfflineRecordData } from '@/types/offlineTypes';
import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import { getDatabase } from './database';

const OFFLINE_IMAGES_DIR = `${(FileSystem as any).documentDirectory}offline_images/`;

/**
 * Ensure offline images directory exists
 */
async function ensureOfflineImagesDirExists(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(OFFLINE_IMAGES_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(OFFLINE_IMAGES_DIR, { intermediates: true });
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
  const extension = imageUri.split('.').pop() || 'jpg';
  const fileName = `${uuid}_${timestamp}.${extension}`;
  const localPath = `${OFFLINE_IMAGES_DIR}${fileName}`;
  
  await FileSystem.copyAsync({
    from: imageUri,
    to: localPath,
  });
  
  return localPath;
}

/**
 * Save a voice note from temporary URI to persistent local storage
 * @param voiceNoteUri - Temporary voice note URI
 * @returns Permanent local file path
 */
export async function saveVoiceNoteLocally(voiceNoteUri: string): Promise<string> {
  await ensureOfflineImagesDirExists();
  
  const uuid = Crypto.randomUUID();
  const timestamp = Date.now();
  const extension = voiceNoteUri.split('.').pop() || 'm4a';
  const fileName = `voice_${uuid}_${timestamp}.${extension}`;
  const localPath = `${OFFLINE_IMAGES_DIR}${fileName}`;
  
  await FileSystem.copyAsync({
    from: voiceNoteUri,
    to: localPath,
  });
  
  return localPath;
}

/**
 * Create an offline record and add to sync queue
 * @param data - Record data including image URI
 * @returns Client-generated record ID
 */
export async function createOfflineRecord(data: OfflineRecordData): Promise<string> {
  const db = await getDatabase();
  const recordId = Crypto.randomUUID();
  const createdAt = new Date().toISOString();
  
  // Save image locally
  const localImagePath = await saveImageLocally(data.imageUri);
  
  // Save voice note locally if provided
  let localVoiceNotePath: string | null = null;
  if (data.voiceNoteUri) {
    localVoiceNotePath = await saveVoiceNoteLocally(data.voiceNoteUri);
  }
  
  try {
    // Insert offline record
    await db.runAsync(
      `INSERT INTO offline_records (
        id, idsource, title, description, kind, author,
        latitude, longitude, level, type, categorie,
        local_image_path, local_voice_note_path, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId,
        data.idsource,
        data.title,
        data.description || null,
        data.kind,
        data.author,
        data.latitude || null,
        data.longitude || null,
        data.level ?? null,
        data.type || null,
        data.categorie || null,
        localImagePath,
        localVoiceNotePath,
        createdAt,
      ]
    );
    
    // Insert sync queue entry
    await db.runAsync(
      `INSERT INTO sync_queue (record_id, status, retry_count)
       VALUES (?, 'pending', 0)`,
      [recordId]
    );
    
    console.log(`Offline record created: ${recordId}`);
    return recordId;
  } catch (error) {
    console.error('Failed to create offline record:', error);
    throw error;
  }
}

/**
 * Get offline records with optional limit
 * @param limit - Maximum number of records to return
 * @returns Array of offline records with sync status
 */
export async function getOfflineRecords(limit?: number): Promise<OfflineRecord[]> {
  const db = await getDatabase();
  
  const sql = `
    SELECT 
      r.*,
      sq.status as sync_status,
      sq.retry_count
    FROM offline_records r
    LEFT JOIN sync_queue sq ON r.id = sq.record_id
    ORDER BY r.created_at DESC
    ${limit ? `LIMIT ${limit}` : ''}
  `;
  
  try {
    const result = await db.getAllAsync<OfflineRecord & { sync_status: string; retry_count: number }>(sql);
    return result.map(row => ({
      id: row.id,
      idsource: row.idsource,
      title: row.title,
      description: row.description,
      kind: row.kind,
      author: row.author,
      latitude: row.latitude,
      longitude: row.longitude,
      level: row.level,
      type: row.type,
      categorie: row.categorie,
      local_image_path: row.local_image_path,
      local_voice_note_path: row.local_voice_note_path,
      created_at: row.created_at,
      sync_status: row.sync_status as any || 'pending',
      retry_count: row.retry_count || 0,
    }));
  } catch (error) {
    console.error('Failed to get offline records:', error);
    throw error;
  }
}

/**
 * Get pending records from sync queue
 * @returns Array of offline records that need to be synced
 */
export async function getPendingSyncRecords(): Promise<OfflineRecord[]> {
  const db = await getDatabase();
  
  try {
    const result = await db.getAllAsync<OfflineRecord & { sync_status: string; retry_count: number }>(
      `SELECT 
        r.*,
        sq.status as sync_status,
        sq.retry_count
      FROM offline_records r
      INNER JOIN sync_queue sq ON r.id = sq.record_id
      WHERE sq.status IN ('pending', 'failed')
      ORDER BY r.created_at ASC`
    );
    
    return result.map(row => ({
      id: row.id,
      idsource: row.idsource,
      title: row.title,
      description: row.description,
      kind: row.kind,
      author: row.author,
      latitude: row.latitude,
      longitude: row.longitude,
      level: row.level,
      type: row.type,
      categorie: row.categorie,
      local_image_path: row.local_image_path,
      local_voice_note_path: row.local_voice_note_path,
      created_at: row.created_at,
      sync_status: row.sync_status as any,
      retry_count: row.retry_count || 0,
    }));
  } catch (error) {
    console.error('Failed to get pending sync records:', error);
    throw error;
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
  status: 'syncing' | 'completed' | 'failed',
  errorMessage?: string
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
      [status, timestamp, errorMessage || null, status, recordId]
    );
    console.log(`Sync status updated for ${recordId}: ${status}`);
  } catch (error) {
    console.error('Failed to update sync status:', error);
    throw error;
  }
}

/**
 * Delete an offline record and its local files
 * @param recordId - Record ID to delete
 */
export async function deleteOfflineRecord(recordId: string): Promise<void> {
  const db = await getDatabase();
  
  try {
    // First, get the record to find file paths
    const records = await db.getAllAsync<OfflineRecord>(
      'SELECT * FROM offline_records WHERE id = ?',
      [recordId]
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
      console.error('Failed to delete local image:', error);
    }
    
    // Delete local voice note file if exists
    if (record.local_voice_note_path) {
      try {
        const voiceNoteInfo = await FileSystem.getInfoAsync(record.local_voice_note_path);
        if (voiceNoteInfo.exists) {
          await FileSystem.deleteAsync(record.local_voice_note_path);
        }
      } catch (error) {
        console.error('Failed to delete local voice note:', error);
      }
    }
    
    // Delete from sync_queue first
    await db.runAsync('DELETE FROM sync_queue WHERE record_id = ?', [recordId]);
    
    // Then delete from offline_records
    await db.runAsync('DELETE FROM offline_records WHERE id = ?', [recordId]);
    
    console.log(`Offline record deleted: ${recordId}`);
  } catch (error) {
    console.error('Failed to delete offline record:', error);
    throw error;
  }
}
