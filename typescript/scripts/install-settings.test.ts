import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  deepMerge,
  getClaudeSettingsDir,
  getClaudeSettingsPath,
  loadExistingSettings,
  saveSettings,
  installSettings,
  installSettingsFromFile,
} from "./install-settings";
import type { InstallConfig } from "@/lib/install-types";

describe("deepMerge", () => {
  test("merges two simple objects", () => {
    const target = { a: 1, b: 2 };
    const source = { b: 3, c: 4 };

    const result = deepMerge(target, source);

    expect(result).toEqual({ a: 1, b: 3, c: 4 });
  });

  test("replaces arrays instead of merging them", () => {
    const target = { arr: [1, 2, 3] };
    const source = { arr: [4, 5] };

    const result = deepMerge(target, source);

    expect(result.arr).toEqual([4, 5]);
  });

  test("deeply merges nested objects", () => {
    const target = {
      level1: {
        level2: {
          a: 1,
          b: 2,
        },
      },
    };
    const source = {
      level1: {
        level2: {
          b: 3,
          c: 4,
        },
      },
    };

    const result = deepMerge(target, source);

    expect(result.level1.level2).toEqual({ a: 1, b: 3, c: 4 });
  });

  test("handles null and undefined in source", () => {
    const target = { a: 1, b: 2 };
    const source = { a: null, b: undefined };

    const result = deepMerge(target, source);

    expect(result.a).toBeNull();
    expect(result.b).toBeUndefined();
  });

  test("handles null target", () => {
    const target = null;
    const source = { a: 1 };

    const result = deepMerge(target, source);

    expect(result).toEqual({ a: 1 });
  });

  test("handles null source", () => {
    const target = { a: 1 };
    const source = null;

    const result = deepMerge(target, source);

    expect(result).toBeNull();
  });

  test("preserves target properties not in source", () => {
    const target = { a: 1, b: 2, c: 3 };
    const source = { b: 20 };

    const result = deepMerge(target, source);

    expect(result).toEqual({ a: 1, b: 20, c: 3 });
  });

  test("handles complex nested structures", () => {
    const target = {
      user: {
        name: "Alice",
        settings: {
          theme: "dark",
          notifications: true,
        },
      },
      data: [1, 2, 3],
    };

    const source = {
      user: {
        settings: {
          notifications: false,
          sound: true,
        },
      },
      data: [4, 5],
    };

    const result = deepMerge(target, source);

    expect(result).toEqual({
      user: {
        name: "Alice",
        settings: {
          theme: "dark",
          notifications: false,
          sound: true,
        },
      },
      data: [4, 5],
    });
  });
});

describe("Settings file operations with temp directories", () => {
  let tempDir: string;
  let mockConfig: InstallConfig;

  beforeEach(() => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `settings-test-${Date.now()}-${Math.random()}`);
    mkdirSync(tempDir, { recursive: true });

    mockConfig = {
      paths: {
        userHome: tempDir,
        userClaudeDir: join(tempDir, ".claude"),
        userLocalBin: join(tempDir, ".local", "bin"),
        userRinsHooks: join(tempDir, "rins_hooks"),
        projectClaudeDir: join(tempDir, "project", ".claude"),
        cursorRulesDir: join(tempDir, "project", ".cursor", "rules"),
        cursorCommandsDir: join(tempDir, "project", ".cursor", "commands"),
      },
      commands: {
        rsyncFlags: ["-a"],
        chmodExecutable: 0o755,
      },
    };
  });

  afterEach(() => {
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("getClaudeSettingsDir returns correct path", () => {
    const dir = getClaudeSettingsDir(mockConfig);
    expect(dir).toBe(mockConfig.paths.userClaudeDir);
  });

  test("getClaudeSettingsPath returns correct path", () => {
    const path = getClaudeSettingsPath(mockConfig);
    expect(path).toBe(join(mockConfig.paths.userClaudeDir, "settings.json"));
  });

  test("loadExistingSettings returns null when file does not exist", () => {
    const settings = loadExistingSettings(mockConfig);
    expect(settings).toBeNull();
  });

  test("loadExistingSettings loads valid settings file", () => {
    const settingsPath = getClaudeSettingsPath(mockConfig);
    mkdirSync(mockConfig.paths.userClaudeDir, { recursive: true });

    const testSettings = {
      cleanupPeriodDays: 30,
      includeCoAuthoredBy: true,
      env: {
        TEST_VAR: "test-value",
      },
    };

    writeFileSync(settingsPath, JSON.stringify(testSettings), "utf-8");

    const loaded = loadExistingSettings(mockConfig);
    expect(loaded).toEqual(testSettings);
  });

  test("loadExistingSettings returns null for invalid JSON", () => {
    const settingsPath = getClaudeSettingsPath(mockConfig);
    mkdirSync(mockConfig.paths.userClaudeDir, { recursive: true });

    writeFileSync(settingsPath, "invalid json{", "utf-8");

    const loaded = loadExistingSettings(mockConfig);
    expect(loaded).toBeNull();
  });

  test("saveSettings creates directory and writes settings", () => {
    const testSettings = {
      cleanupPeriodDays: 45,
      env: {
        API_KEY: "secret",
      },
    };

    saveSettings(testSettings, mockConfig);

    const settingsPath = getClaudeSettingsPath(mockConfig);
    expect(existsSync(settingsPath)).toBe(true);

    const content = readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(testSettings);
  });

  test("installSettings merges with existing settings", () => {
    const settingsPath = getClaudeSettingsPath(mockConfig);
    mkdirSync(mockConfig.paths.userClaudeDir, { recursive: true });

    // Create existing settings
    const existingSettings = {
      cleanupPeriodDays: 30,
      includeCoAuthoredBy: true,
      env: {
        EXISTING_VAR: "existing-value",
      },
    };
    writeFileSync(settingsPath, JSON.stringify(existingSettings), "utf-8");

    // Install new settings
    const newSettings = {
      cleanupPeriodDays: 60,
      env: {
        NEW_VAR: "new-value",
      },
    };

    installSettings(newSettings, mockConfig);

    // Verify merge
    const content = readFileSync(settingsPath, "utf-8");
    const merged = JSON.parse(content);

    expect(merged.cleanupPeriodDays).toBe(60);
    expect(merged.includeCoAuthoredBy).toBe(true);
    expect(merged.env?.EXISTING_VAR).toBe("existing-value");
    expect(merged.env?.NEW_VAR).toBe("new-value");
  });

  test("installSettings creates new file when none exists", () => {
    const newSettings = {
      cleanupPeriodDays: 90,
      env: {
        MY_VAR: "my-value",
      },
    };

    installSettings(newSettings, mockConfig);

    const settingsPath = getClaudeSettingsPath(mockConfig);
    expect(existsSync(settingsPath)).toBe(true);

    const content = readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(newSettings);
  });

  test("installSettingsFromFile throws error when source file does not exist", () => {
    const nonexistentPath = join(tempDir, "nonexistent.json");

    expect(() => installSettingsFromFile(nonexistentPath, mockConfig)).toThrow(
      "Source settings file not found"
    );
  });

  test("installSettingsFromFile installs settings from file", () => {
    const sourcePath = join(tempDir, "source-settings.json");
    const sourceSettings = {
      cleanupPeriodDays: 14,
      env: {
        FROM_FILE: "file-value",
      },
    };

    writeFileSync(sourcePath, JSON.stringify(sourceSettings), "utf-8");

    installSettingsFromFile(sourcePath, mockConfig);

    const settingsPath = getClaudeSettingsPath(mockConfig);
    expect(existsSync(settingsPath)).toBe(true);

    const content = readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed).toEqual(sourceSettings);
  });

  test("installSettingsFromFile merges with existing settings", () => {
    const settingsPath = getClaudeSettingsPath(mockConfig);
    mkdirSync(mockConfig.paths.userClaudeDir, { recursive: true });

    // Create existing settings
    const existingSettings = {
      cleanupPeriodDays: 30,
      env: {
        EXISTING_VAR: "existing-value",
      },
    };
    writeFileSync(settingsPath, JSON.stringify(existingSettings), "utf-8");

    // Create source file
    const sourcePath = join(tempDir, "source-settings.json");
    const sourceSettings = {
      includeCoAuthoredBy: false,
      env: {
        FROM_FILE: "file-value",
      },
    };
    writeFileSync(sourcePath, JSON.stringify(sourceSettings), "utf-8");

    installSettingsFromFile(sourcePath, mockConfig);

    // Verify merge
    const content = readFileSync(settingsPath, "utf-8");
    const merged = JSON.parse(content);

    expect(merged.cleanupPeriodDays).toBe(30);
    expect(merged.includeCoAuthoredBy).toBe(false);
    expect(merged.env?.EXISTING_VAR).toBe("existing-value");
    expect(merged.env?.FROM_FILE).toBe("file-value");
  });
});
