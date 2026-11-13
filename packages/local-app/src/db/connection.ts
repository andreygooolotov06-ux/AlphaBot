import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';

export class DatabaseConnection {
  private static instance: DatabaseSync | null = null;

  public static getDatabase(dbPath?: string): DatabaseSync {
    if (this.instance) {
      return this.instance;
    }

    const defaultPath = path.resolve(process.cwd(), 'storage/data/alphadate.sqlite');
    const finalPath = dbPath ?? process.env['SQLITE_DB_PATH'] ?? defaultPath;

    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    console.log(`[Database] Initializing SQLite database at: ${finalPath}`);
    const db = new DatabaseSync(finalPath);

    // Apply performance & integrity pragmas
    db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
    `);

    this.instance = db;
    return db;
  }

  public static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      console.log('[Database] Database connection closed.');
    }
  }
}
