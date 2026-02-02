/**
 * Offline record stored in SQLite database
 */
export interface OfflineRecord {
  id: string; // client UUID
  idsource: string;
  title: string;
  description: string | null;
  kind: string;
  author: string;
  idauthor?: string;
  iddevice?: string;
  chantier?: string;
  audiotxt?: string;
  iatxt?: string;
  latitude: string | null;
  longitude: string | null;
  altitude: string | null;
  accuracy: string | null;
  altitudeAccuracy: string | null;
  level: number;
  type: string | null;
  categorie: string | null;
  local_image_path: string;
  local_voice_note_path: string | null;
  created_at: string;
  sync_status?: "pending" | "syncing" | "completed" | "failed";
  retry_count?: number;
}

/**
 * Data required to create an offline record
 */
export interface OfflineRecordData {
  idsource: string;
  title: string;
  description?: string;
  kind: string;
  author: string;
  idauthor?: string;
  iddevice?: string;
  chantier?: string;
  audiotxt?: string;
  iatxt?: string;
  latitude?: string;
  longitude?: string;
  altitude?: string;
  accuracy?: string;
  altitudeAccuracy?: string;
  level?: number;
  type?: string;
  categorie?: string;
  imageUri: string;
  voiceNoteUri?: string;
}

/**
 * Result of synchronization operation
 */
export interface SyncResult {
  synced: number;
  failed: number;
  errors: Array<{ recordId: string; error: string }>;
}

/**
 * Sync queue entry
 */
export interface SyncQueueEntry {
  id: number;
  record_id: string;
  status: "pending" | "syncing" | "completed" | "failed";
  retry_count: number;
  last_attempt_at: string | null;
  error_message: string | null;
}
