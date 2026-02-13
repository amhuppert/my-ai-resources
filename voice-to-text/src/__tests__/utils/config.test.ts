import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  spyOn,
  mock,
} from "bun:test";
import { join, resolve } from "node:path";

// --- Mock state ---
let fsFiles: Record<string, string> = {};
let mockCwd = "/projects/myapp";
const mockHome = "/home/testuser";
const CONFIG_DIR = join(mockHome, ".config", "voice-to-text");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

mock.module("node:fs", () => ({
  existsSync: (path: string) => path in fsFiles,
  readFileSync: (path: string, _encoding: string) => {
    if (path in fsFiles) return fsFiles[path];
    throw new Error(`ENOENT: no such file: ${path}`);
  },
}));

mock.module("node:os", () => ({
  homedir: () => mockHome,
}));

// Save original process methods
const originalCwd = process.cwd;
const originalExit = process.exit;

const { loadConfig, loadLocalConfig, resolveConfig, mergeConfig } =
  await import("../../utils/config.js");

describe("config", () => {
  let errorSpy: ReturnType<typeof spyOn>;
  let exitSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    fsFiles = {};
    mockCwd = "/projects/myapp";
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
    exitSpy = spyOn(process, "exit").mockImplementation(
      (_code?: number) => undefined as never,
    );
    process.cwd = () => mockCwd;
  });

  afterEach(() => {
    errorSpy.mockRestore();
    exitSpy.mockRestore();
    process.cwd = originalCwd;
  });

  describe("loadConfig()", () => {
    test("returns defaults when no config file exists", () => {
      const config = loadConfig();
      expect(config.hotkey).toBe("F9");
      expect(config.autoInsert).toBe(true);
      expect(config.beepEnabled).toBe(true);
      expect(config.maxRecordingDuration).toBe(300);
    });

    test("loads config when file exists", () => {
      fsFiles[CONFIG_PATH] = JSON.stringify({
        hotkey: "F10",
        beepEnabled: false,
      });
      const config = loadConfig();
      expect(config.hotkey).toBe("F10");
      expect(config.beepEnabled).toBe(false);
      expect(config.autoInsert).toBe(true); // default
    });

    test("returns defaults on invalid JSON", () => {
      fsFiles[CONFIG_PATH] = "not valid json{";
      const config = loadConfig();
      expect(config.hotkey).toBe("F9");
      expect(errorSpy).toHaveBeenCalled();
    });

    test("returns defaults on validation error", () => {
      fsFiles[CONFIG_PATH] = JSON.stringify({ hotkey: 123 });
      const config = loadConfig();
      expect(config.hotkey).toBe("F9");
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("loadLocalConfig()", () => {
    test("returns null when no local config file exists", () => {
      const config = loadLocalConfig();
      expect(config).toBeNull();
    });

    test("loads config when voice.json exists in cwd", () => {
      fsFiles[join(mockCwd, "voice.json")] = JSON.stringify({
        hotkey: "F11",
        beepEnabled: false,
      });
      const config = loadLocalConfig();
      expect(config).not.toBeNull();
      expect(config!.hotkey).toBe("F11");
      expect(config!.beepEnabled).toBe(false);
    });

    test("returns null on invalid JSON", () => {
      fsFiles[join(mockCwd, "voice.json")] = "{invalid";
      const config = loadLocalConfig();
      expect(config).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });

    test("returns null on validation error", () => {
      fsFiles[join(mockCwd, "voice.json")] = JSON.stringify({
        hotkey: 42,
      });
      const config = loadLocalConfig();
      expect(config).toBeNull();
      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe("resolveConfig()", () => {
    test("global config only — applies defaults", () => {
      const resolution = resolveConfig({ cliOpts: {} });
      expect(resolution.config.hotkey).toBe("F9");
      expect(resolution.config.contextFiles).toEqual([]);
      expect(resolution.config.instructionsFiles).toEqual([]);
    });

    test("local config overrides global config", () => {
      fsFiles[CONFIG_PATH] = JSON.stringify({ hotkey: "F10" });
      fsFiles[join(mockCwd, "voice.json")] = JSON.stringify({
        hotkey: "F11",
      });

      const resolution = resolveConfig({ cliOpts: {} });
      expect(resolution.config.hotkey).toBe("F11");
    });

    test("CLI options override all layers", () => {
      fsFiles[CONFIG_PATH] = JSON.stringify({ hotkey: "F10" });
      fsFiles[join(mockCwd, "voice.json")] = JSON.stringify({
        hotkey: "F11",
      });

      const resolution = resolveConfig({
        cliOpts: { hotkey: "F12" },
      });
      expect(resolution.config.hotkey).toBe("F12");
    });

    test("context files accumulate from multiple layers", () => {
      fsFiles[CONFIG_PATH] = JSON.stringify({
        contextFile: "global-ctx.md",
      });
      fsFiles[join(mockCwd, "voice.json")] = JSON.stringify({
        contextFile: "local-ctx.md",
      });

      const resolution = resolveConfig({ cliOpts: {} });
      expect(resolution.config.contextFiles).toHaveLength(2);
      expect(resolution.config.contextFiles[0].source).toBe("global");
      expect(resolution.config.contextFiles[0].path).toBe(
        resolve(CONFIG_DIR, "global-ctx.md"),
      );
      expect(resolution.config.contextFiles[1].source).toBe("local");
      expect(resolution.config.contextFiles[1].path).toBe(
        resolve(mockCwd, "local-ctx.md"),
      );
    });

    test("CLI contextFile replaces all accumulated context files", () => {
      fsFiles[CONFIG_PATH] = JSON.stringify({
        contextFile: "global-ctx.md",
      });
      fsFiles[join(mockCwd, "voice.json")] = JSON.stringify({
        contextFile: "local-ctx.md",
      });

      const resolution = resolveConfig({
        cliOpts: { contextFile: "cli-ctx.md" },
      });
      expect(resolution.config.contextFiles).toHaveLength(1);
      expect(resolution.config.contextFiles[0].source).toBe("cli");
      expect(resolution.config.contextFiles[0].path).toBe(
        resolve(mockCwd, "cli-ctx.md"),
      );
    });

    test("deduplication by resolved path", () => {
      // Both global and local point to the same resolved path
      fsFiles[CONFIG_PATH] = JSON.stringify({
        contextFile: resolve(mockCwd, "shared.md"),
      });
      fsFiles[join(mockCwd, "voice.json")] = JSON.stringify({
        contextFile: "shared.md",
      });

      const resolution = resolveConfig({ cliOpts: {} });
      // Should only have one entry due to deduplication
      expect(resolution.config.contextFiles).toHaveLength(1);
    });

    test("instructions files accumulate independently from context files", () => {
      fsFiles[CONFIG_PATH] = JSON.stringify({
        contextFile: "ctx.md",
        instructionsFile: "instr.md",
      });

      const resolution = resolveConfig({ cliOpts: {} });
      expect(resolution.config.contextFiles).toHaveLength(1);
      expect(resolution.config.instructionsFiles).toHaveLength(1);
      expect(resolution.config.contextFiles[0].path).toBe(
        resolve(CONFIG_DIR, "ctx.md"),
      );
      expect(resolution.config.instructionsFiles[0].path).toBe(
        resolve(CONFIG_DIR, "instr.md"),
      );
    });

    test("loadedFrom metadata is correct", () => {
      fsFiles[CONFIG_PATH] = JSON.stringify({ hotkey: "F10" });
      fsFiles[join(mockCwd, "voice.json")] = JSON.stringify({
        hotkey: "F11",
      });

      const resolution = resolveConfig({ cliOpts: {} });
      expect(resolution.loadedFrom).toHaveLength(2);
      expect(resolution.loadedFrom[0].layer).toBe("global");
      expect(resolution.loadedFrom[0].found).toBe(true);
      expect(resolution.loadedFrom[1].layer).toBe("local");
      expect(resolution.loadedFrom[1].found).toBe(true);
    });

    test("loadedFrom shows found=false when files missing", () => {
      const resolution = resolveConfig({ cliOpts: {} });
      expect(resolution.loadedFrom[0].found).toBe(false);
      expect(resolution.loadedFrom[1].found).toBe(false);
    });

    test("exits on missing specified config file", () => {
      resolveConfig({
        configPath: "/nonexistent/config.json",
        cliOpts: {},
      });
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("exits on invalid specified config file", () => {
      fsFiles["/custom/config.json"] = "{invalid json";
      resolveConfig({
        configPath: "/custom/config.json",
        cliOpts: {},
      });
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    test("specified config adds loadedFrom entry", () => {
      fsFiles["/custom/config.json"] = JSON.stringify({ hotkey: "F12" });
      const resolution = resolveConfig({
        configPath: "/custom/config.json",
        cliOpts: {},
      });
      expect(resolution.loadedFrom).toHaveLength(3);
      expect(resolution.loadedFrom[2].layer).toBe("specified");
      expect(resolution.loadedFrom[2].found).toBe(true);
    });
  });

  describe("mergeConfig()", () => {
    test("CLI opts override file config values", () => {
      const fileConfig = {
        hotkey: "F9",
        fileHotkey: "F10",
        autoInsert: true,
        beepEnabled: true,
        notificationEnabled: true,
        terminalOutputEnabled: true,
        maxRecordingDuration: 300,
      };
      const result = mergeConfig(fileConfig, { hotkey: "F12" });
      expect(result.hotkey).toBe("F12");
      expect(result.autoInsert).toBe(true); // unchanged
    });

    test("undefined opts do not override", () => {
      const fileConfig = {
        hotkey: "F10",
        fileHotkey: "F10",
        autoInsert: false,
        beepEnabled: true,
        notificationEnabled: true,
        terminalOutputEnabled: true,
        maxRecordingDuration: 300,
      };
      const result = mergeConfig(fileConfig, {
        hotkey: undefined,
        autoInsert: undefined,
      });
      expect(result.hotkey).toBe("F10");
      expect(result.autoInsert).toBe(false);
    });

    test("validates merged result against schema", () => {
      const fileConfig = {
        hotkey: "F9",
        fileHotkey: "F10",
        autoInsert: true,
        beepEnabled: true,
        notificationEnabled: true,
        terminalOutputEnabled: true,
        maxRecordingDuration: 300,
      };
      // mergeConfig should successfully validate
      const result = mergeConfig(fileConfig, { beepEnabled: false });
      expect(result.beepEnabled).toBe(false);
    });
  });
});
