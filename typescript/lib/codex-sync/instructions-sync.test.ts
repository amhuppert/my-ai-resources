import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
  readFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { syncInstructions } from "./instructions-sync.ts";

describe("syncInstructions", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "instructions-sync-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("copies source file to destination and returns synced result", () => {
    const sourcePath = join(tempDir, "CLAUDE.md");
    const destPath = join(tempDir, "AGENTS.override.md");
    writeFileSync(sourcePath, "# Instructions\nSome content here.");

    const result = syncInstructions(sourcePath, destPath);

    expect(result.status).toBe("synced");
    expect(result.artifact).toBe("instructions");
    expect(result.destPath).toBe(destPath);
    expect(existsSync(destPath)).toBe(true);
    expect(readFileSync(destPath, "utf-8")).toBe(
      "# Instructions\nSome content here.",
    );
  });

  test("returns skipped result when source file does not exist", () => {
    const sourcePath = join(tempDir, "nonexistent", "CLAUDE.md");
    const destPath = join(tempDir, "AGENTS.override.md");

    const result = syncInstructions(sourcePath, destPath);

    expect(result.status).toBe("skipped");
    expect(result.artifact).toBe("instructions");
    expect(result.reason).toBeString();
    expect(result.reason).toInclude(sourcePath);
    expect(existsSync(destPath)).toBe(false);
  });

  test("overwrites existing destination file", () => {
    const sourcePath = join(tempDir, "CLAUDE.md");
    const destPath = join(tempDir, "AGENTS.override.md");
    writeFileSync(destPath, "old content");
    writeFileSync(sourcePath, "new content");

    const result = syncInstructions(sourcePath, destPath);

    expect(result.status).toBe("synced");
    expect(readFileSync(destPath, "utf-8")).toBe("new content");
  });

  test("creates parent directories for destination if they do not exist", () => {
    const sourcePath = join(tempDir, "CLAUDE.md");
    const destPath = join(tempDir, "nested", "deep", "AGENTS.override.md");
    writeFileSync(sourcePath, "content for nested dest");

    const result = syncInstructions(sourcePath, destPath);

    expect(result.status).toBe("synced");
    expect(result.destPath).toBe(destPath);
    expect(existsSync(destPath)).toBe(true);
    expect(readFileSync(destPath, "utf-8")).toBe("content for nested dest");
  });
});
