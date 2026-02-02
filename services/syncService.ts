import { SyncResult } from "@/types/offlineTypes";
import { AppState, AppStateStatus } from "react-native";
import { getConnectivity, startConnectivityMonitoring } from "./connectivity";
import { createGed } from "./gedService";
import {
    deleteOfflineRecord,
    getPendingSyncRecords,
    updateSyncStatus,
} from "./offlineStorageService";

let syncInProgress = false;

/**
 * Sync pending offline records to the backend
 * @param token - Authentication token
 * @returns Sync result with counts and errors
 */
export async function syncPendingRecords(token: string): Promise<SyncResult> {
  if (syncInProgress) {
    console.log("Sync already in progress, skipping...");
    return { synced: 0, failed: 0, errors: [] };
  }

  syncInProgress = true;
  const result: SyncResult = {
    synced: 0,
    failed: 0,
    errors: [],
  };

  try {
    const pendingRecords = await getPendingSyncRecords();

    if (pendingRecords.length === 0) {
      console.log("No pending records to sync");
      return result;
    }

    console.log(
      `Starting sync for ${pendingRecords.length} pending records...`,
    );

    for (const record of pendingRecords) {
      try {
        // Update status to syncing
        await updateSyncStatus(record.id, "syncing");

        // Prepare file object for image
        const fileName =
          record.local_image_path.split("/").pop() || `image_${Date.now()}.jpg`;
        const fileType = fileName.split(".").pop() || "jpeg";

        // Upload image (qualiphoto)
        await createGed(token, {
          idsource: record.id, // Use client UUID as idsource for idempotency
          title: record.title,
          description: record.description || undefined,
          kind: record.kind,
          author: record.author,
          idauthor: record.idauthor,
          iddevice: record.iddevice,
          chantier: record.chantier,
          audiotxt: record.audiotxt,
          iatxt: record.iatxt,
          latitude: record.latitude || undefined,
          longitude: record.longitude || undefined,
          level: record.level,
          type: record.type || undefined,
          categorie: record.categorie || undefined,
          file: {
            uri: record.local_image_path,
            type: `image/${fileType}`,
            name: fileName,
          },
        });

        // Upload voice note if exists
        if (record.local_voice_note_path) {
          const voiceFileName =
            record.local_voice_note_path.split("/").pop() ||
            `voice_${Date.now()}.m4a`;
          await createGed(token, {
            idsource: record.id,
            title: `${record.title} - Voice Note`,
            kind: "voice_note",
            author: record.author,
            file: {
              uri: record.local_voice_note_path,
              type: "audio/m4a",
              name: voiceFileName,
            },
          });
        }

        // Mark as completed and delete local record
        await updateSyncStatus(record.id, "completed");
        await deleteOfflineRecord(record.id);

        result.synced++;
        console.log(`Successfully synced record: ${record.id}`);
      } catch (error: any) {
        // Mark as failed
        const errorMessage = error?.message || "Unknown error";
        await updateSyncStatus(record.id, "failed", errorMessage);

        result.failed++;
        result.errors.push({
          recordId: record.id,
          error: errorMessage,
        });

        console.error(`Failed to sync record ${record.id}:`, error);
      }
    }

    console.log(
      `Sync completed: ${result.synced} synced, ${result.failed} failed`,
    );
  } finally {
    syncInProgress = false;
  }

  return result;
}

/**
 * Check if sync should be triggered
 * @param token - Authentication token
 */
async function checkAndSync(
  token: string,
  onSyncComplete?: (result: SyncResult) => void,
): Promise<void> {
  // Check network connectivity
  const connectivity = await getConnectivity();

  if (connectivity.status !== "online") {
    console.log("Device is offline, skipping sync");
    return;
  }

  // Check if there are pending records
  const pendingRecords = await getPendingSyncRecords();

  if (pendingRecords.length === 0) {
    console.log("No pending records, skipping sync");
    return;
  }

  console.log(`Triggering sync for ${pendingRecords.length} pending records`);

  // Perform sync
  const result = await syncPendingRecords(token);

  // Notify callback
  if (onSyncComplete) {
    onSyncComplete(result);
  }
}

/**
 * Start monitoring for sync triggers
 * @param token - Authentication token
 * @param onSyncComplete - Optional callback when sync completes
 * @returns Cleanup function to stop monitoring
 */
export function startSyncMonitoring(
  token: string,
  onSyncComplete?: (result: SyncResult) => void,
): () => void {
  const cleanupFunctions: Array<() => void> = [];

  // Monitor network connectivity changes
  const stopConnectivityMonitoring = startConnectivityMonitoring(
    (connectivity) => {
      if (connectivity.status === "online") {
        console.log("Network is now online, checking for pending sync...");
        void checkAndSync(token, onSyncComplete);
      }
    },
  );
  cleanupFunctions.push(stopConnectivityMonitoring);

  // Monitor app state changes (foreground/background)
  let lastAppState: AppStateStatus = AppState.currentState;
  const appStateSubscription = AppState.addEventListener(
    "change",
    (nextAppState) => {
      if (
        lastAppState.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        console.log("App came to foreground, checking for pending sync...");
        void checkAndSync(token, onSyncComplete);
      }
      lastAppState = nextAppState;
    },
  );
  cleanupFunctions.push(() => appStateSubscription.remove());

  // Initial sync check
  void checkAndSync(token, onSyncComplete);

  // Return cleanup function
  return () => {
    cleanupFunctions.forEach((cleanup) => cleanup());
  };
}

/**
 * Manually trigger a sync
 * @param token - Authentication token
 * @returns Sync result
 */
export async function triggerManualSync(token: string): Promise<SyncResult> {
  const connectivity = await getConnectivity();

  if (connectivity.status !== "online") {
    throw new Error("Cannot sync while offline");
  }

  return syncPendingRecords(token);
}
