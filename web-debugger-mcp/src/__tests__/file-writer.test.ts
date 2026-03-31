import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { appendLogEntry, writeSnapshot } from "../lib/file-writer.js";

describe("file-writer", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "web-debugger-test-"));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("appendLogEntry", () => {
    it("creates directory and file on first write", async () => {
      const logFile = path.join(tmpDir, "logs", "session-test.jsonl");
      await appendLogEntry(logFile, {
        timestamp: "2026-03-30T14:30:00.000Z",
        level: "info",
        source: "server",
        message: "Hello",
      });
      const content = await readFile(logFile, "utf-8");
      expect(content).toBe(
        '{"timestamp":"2026-03-30T14:30:00.000Z","level":"info","source":"server","message":"Hello"}\n',
      );
    });

    it("appends JSONL entries one per line", async () => {
      const logFile = path.join(tmpDir, "logs", "session-test.jsonl");
      await appendLogEntry(logFile, {
        timestamp: "2026-03-30T14:30:00.000Z",
        level: "info",
        source: "server",
        message: "First",
      });
      await appendLogEntry(logFile, {
        timestamp: "2026-03-30T14:30:01.000Z",
        level: "error",
        source: "browser",
        message: "Second",
        context: { code: 500 },
      });
      const content = await readFile(logFile, "utf-8");
      const lines = content.trimEnd().split("\n");
      expect(lines).toHaveLength(2);

      const entry1 = JSON.parse(lines[0]);
      expect(entry1.message).toBe("First");

      const entry2 = JSON.parse(lines[1]);
      expect(entry2.message).toBe("Second");
      expect(entry2.context).toEqual({ code: 500 });
    });

    it("includes context when provided", async () => {
      const logFile = path.join(tmpDir, "session.jsonl");
      await appendLogEntry(logFile, {
        timestamp: "2026-03-30T14:30:00.000Z",
        level: "debug",
        source: "server",
        message: "With context",
        context: { userId: "abc", items: [1, 2, 3] },
      });
      const content = await readFile(logFile, "utf-8");
      const entry = JSON.parse(content.trim());
      expect(entry.context).toEqual({ userId: "abc", items: [1, 2, 3] });
    });
  });

  describe("writeSnapshot", () => {
    it("writes snapshot JSON file and returns absolute path", async () => {
      const filePath = await writeSnapshot(tmpDir, "react-query", {
        queries: [{ key: "users", data: [1, 2] }],
      });
      expect(path.isAbsolute(filePath)).toBe(true);
      expect(filePath).toContain("snapshots");
      expect(filePath).toContain("react-query");
      expect(filePath).toMatch(/\.json$/);

      const content = await readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      expect(data).toEqual({ queries: [{ key: "users", data: [1, 2] }] });
    });

    it("creates snapshots directory if it does not exist", async () => {
      const filePath = await writeSnapshot(tmpDir, "auth-state", {
        user: "alice",
      });
      expect(filePath).toContain(path.join(tmpDir, "snapshots"));
    });

    it("generates unique filenames for successive snapshots", async () => {
      const path1 = await writeSnapshot(tmpDir, "test-provider", { v: 1 });
      const path2 = await writeSnapshot(tmpDir, "test-provider", { v: 2 });
      expect(path1).not.toBe(path2);
    });

    it("sanitizes provider names with path separators", async () => {
      const filePath = await writeSnapshot(tmpDir, "../escape-attempt", { v: 1 });
      // File must stay inside the snapshots directory
      expect(filePath.startsWith(path.join(tmpDir, "snapshots"))).toBe(true);
      expect(filePath).not.toContain("..");
    });

    it("sanitizes provider names with slashes", async () => {
      const filePath = await writeSnapshot(tmpDir, "dir/name", { v: 1 });
      expect(filePath.startsWith(path.join(tmpDir, "snapshots"))).toBe(true);
      expect(path.dirname(filePath)).toBe(path.join(tmpDir, "snapshots"));
    });
  });
});
