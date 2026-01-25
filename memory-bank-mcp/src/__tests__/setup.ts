import { beforeEach, afterEach } from "bun:test";
import { closeDb, setDbPath } from "../db/connection.js";

/**
 * Setup for integration tests using in-memory SQLite database.
 * Each test gets a fresh database.
 */
export function setupTestDb() {
  beforeEach(() => {
    // Close any existing connection and set to in-memory
    closeDb();
    setDbPath(":memory:");
  });

  afterEach(() => {
    // Clean up after each test
    closeDb();
  });
}
