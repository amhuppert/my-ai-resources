import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, writeFileSync, existsSync, rmSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadOrCreateSyncConfig } from "./sync-config.ts";
import { DEFAULT_SYNC_CONFIG } from "./schemas.ts";

describe("loadOrCreateSyncConfig", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "sync-config-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("creates default config file when missing", () => {
    const configPath = join(tempDir, "codex-sync.json");
    const result = loadOrCreateSyncConfig(configPath);

    expect(existsSync(configPath)).toBe(true);
    expect(result.modelMapping).toEqual(DEFAULT_SYNC_CONFIG.modelMapping);
  });

  test("created default file is valid JSON matching defaults", () => {
    const configPath = join(tempDir, "codex-sync.json");
    loadOrCreateSyncConfig(configPath);

    const fileContent = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(fileContent).toEqual(DEFAULT_SYNC_CONFIG);
  });

  test("loads existing valid config", () => {
    const configPath = join(tempDir, "codex-sync.json");
    const customConfig = {
      modelMapping: {
        sonnet: "custom-model",
        opus: "another-model",
      },
    };
    writeFileSync(configPath, JSON.stringify(customConfig));

    const result = loadOrCreateSyncConfig(configPath);
    expect(result.modelMapping).toEqual(customConfig.modelMapping);
  });

  test("preserves unknown properties in config file", () => {
    const configPath = join(tempDir, "codex-sync.json");
    const configWithExtra = {
      modelMapping: { sonnet: "gpt-5.3-codex-spark" },
      futureField: "preserved-value",
    };
    writeFileSync(configPath, JSON.stringify(configWithExtra));

    const result = loadOrCreateSyncConfig(configPath);
    expect((result as Record<string, unknown>)["futureField"]).toBe(
      "preserved-value",
    );
  });

  test("throws on invalid config (missing modelMapping)", () => {
    const configPath = join(tempDir, "codex-sync.json");
    writeFileSync(configPath, JSON.stringify({ invalid: true }));

    expect(() => loadOrCreateSyncConfig(configPath)).toThrow();
  });

  test("throws on non-JSON file", () => {
    const configPath = join(tempDir, "codex-sync.json");
    writeFileSync(configPath, "not json at all");

    expect(() => loadOrCreateSyncConfig(configPath)).toThrow();
  });

  test("creates parent directories if needed", () => {
    const configPath = join(tempDir, "nested", "dir", "codex-sync.json");
    const result = loadOrCreateSyncConfig(configPath);

    expect(existsSync(configPath)).toBe(true);
    expect(result.modelMapping).toEqual(DEFAULT_SYNC_CONFIG.modelMapping);
  });
});
