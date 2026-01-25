import { Database } from "bun:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { SCHEMA_SQL } from "./schema.js";

const DB_DIR = ".claude";
const DB_NAME = "memory-bank.db";

let db: Database | null = null;
let customDbPath: string | null = null;

function getDbPath(): string {
  if (customDbPath !== null) {
    return customDbPath;
  }
  return join(process.cwd(), DB_DIR, DB_NAME);
}

function ensureDbDirectory(): void {
  const dbPath = getDbPath();
  // For :memory: databases, no directory needed
  if (dbPath === ":memory:") {
    return;
  }
  const dirPath = dirname(dbPath);
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

function initializeSchema(database: Database): void {
  database.exec(SCHEMA_SQL);
}

export function getDb(): Database {
  if (db === null) {
    ensureDbDirectory();
    const dbPath = getDbPath();
    db = new Database(dbPath);
    db.exec("PRAGMA foreign_keys = ON");
    initializeSchema(db);
  }
  return db;
}

export function closeDb(): void {
  if (db !== null) {
    db.close();
    db = null;
  }
}

/**
 * Set a custom database path for testing.
 * Use ":memory:" for in-memory database.
 * Call resetDb() first to close existing connection.
 */
export function setDbPath(path: string): void {
  customDbPath = path;
}

/**
 * Reset the database connection and clear custom path.
 * Must be called before setDbPath to take effect.
 */
export function resetDb(): void {
  closeDb();
  customDbPath = null;
}
