import { Platform } from 'react-native';

// Conditional import: only import SQLite on native platforms
let SQLite: typeof import('expo-sqlite') | null = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

// Type definition for database (can be null on web)
type SQLiteDatabase = typeof SQLite extends null ? null : import('expo-sqlite').SQLiteDatabase;

let database: SQLiteDatabase | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize database schema
 */
async function initializeDatabase(db: any): Promise<void> {
  if (!db) return;
  
  try {
    // Create offline_records table
    await db.execAsync(`
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
    console.log('[Database] offline_records table created successfully');

    // Create sync_queue table
    await db.execAsync(`
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
    console.log('[Database] sync_queue table created successfully');

    // Create index on sync_queue status for faster queries
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
    `);
    console.log('[Database] sync_queue status index created successfully');

    // Create index on offline_records created_at for sorting
    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_offline_records_created_at ON offline_records(created_at);
    `);
    console.log('[Database] offline_records created_at index created successfully');
  } catch (error) {
    console.error('[Database] Failed to initialize database schema:', error);
    throw error;
  }
}

/**
 * Initialize and return the SQLite database instance
 * Returns null on web platform (SQLite not supported)
 */
export async function getDatabase(): Promise<any> {
  // SQLite is not available on web
  if (Platform.OS === 'web' || !SQLite) {
    console.log('[Database] SQLite not available on web platform');
    return null;
  }

  // If database already exists and is valid, return it
  if (database) {
    return database;
  }

  // If already initializing, wait for that to complete
  if (isInitializing && initPromise) {
    await initPromise;
    if (database) {
      return database;
    }
  }

  // Start initialization
  isInitializing = true;
  
  try {
    initPromise = (async () => {
      console.log('[Database] Opening database...');
      database = await SQLite!.openDatabaseAsync('galerie_offline.db');
      console.log('[Database] Database opened successfully');
      
      await initializeDatabase(database);
      console.log('[Database] Database initialization complete');
    })();
    
    await initPromise;
    
    if (!database) {
      throw new Error('Database initialization failed - database is null');
    }
    
    return database;
  } catch (error) {
    console.error('[Database] Failed to get database:', error);
    database = null;
    throw error;
  } finally {
    isInitializing = false;
    initPromise = null;
  }
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (database) {
    try {
      await database.closeAsync();
      console.log('[Database] Database closed successfully');
    } catch (error) {
      console.error('[Database] Failed to close database:', error);
    } finally {
      database = null;
    }
  }
}

/**
 * Execute a raw SQL query (for debugging/testing)
 * Not available on web platform
 */
export async function executeSql(
  sql: string,
  params: any[] = []
): Promise<any> {
  const db = await getDatabase();
  if (!db) {
    throw new Error('Database not available on web platform');
  }
  return db.runAsync(sql, params);
}
