import * as SQLite from 'expo-sqlite';

let database: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize and return the SQLite database instance
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!database) {
    database = await SQLite.openDatabaseAsync('galerie_offline.db');
    await initializeDatabase();
  }
  return database;
}

/**
 * Initialize database schema
 */
async function initializeDatabase(): Promise<void> {
  if (!database) return;

  try {
    // Create offline_records table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_records (
        id TEXT PRIMARY KEY NOT NULL,
        idsource TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        kind TEXT NOT NULL,
        author TEXT NOT NULL,
        latitude TEXT,
        longitude TEXT,
        level INTEGER,
        type TEXT,
        categorie TEXT,
        local_image_path TEXT NOT NULL,
        local_voice_note_path TEXT,
        created_at TEXT NOT NULL
      );
    `);
    console.log('offline_records table created successfully');

    // Create sync_queue table
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        last_attempt_at TEXT,
        error_message TEXT,
        FOREIGN KEY (record_id) REFERENCES offline_records (id) ON DELETE CASCADE
      );
    `);
    console.log('sync_queue table created successfully');

    // Create index on sync_queue status for faster queries
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    `);
    console.log('sync_queue status index created successfully');

    // Create index on offline_records created_at for sorting
    await database.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_records_created_at ON offline_records(created_at);
    `);
    console.log('offline_records created_at index created successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (database) {
    await database.closeAsync();
    database = null;
  }
}

/**
 * Execute a raw SQL query (for debugging/testing)
 */
export async function executeSql(
  sql: string,
  params: any[] = []
): Promise<SQLite.SQLiteRunResult> {
  const db = await getDatabase();
  return db.runAsync(sql, params);
}
