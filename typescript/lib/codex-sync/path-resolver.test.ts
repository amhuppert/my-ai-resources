import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, existsSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir, homedir } from "os";
import { resolveSyncPaths } from "./path-resolver.ts";

describe("resolveSyncPaths", () => {
  describe("user scope", () => {
    test("resolves source paths relative to home directory", () => {
      const home = homedir();
      const paths = resolveSyncPaths("user");

      expect(paths.claudeMdSource).toBe(join(home, ".claude", "CLAUDE.md"));
      expect(paths.pluginScanRoot).toBe(join(home, ".claude", "plugins"));
      expect(paths.standaloneSkillsDir).toBe(join(home, ".claude", "skills"));
      expect(paths.commandsDir).toBe(join(home, ".claude", "commands"));
      expect(paths.standaloneAgentsDir).toBe(join(home, ".claude", "agents"));
      expect(paths.mcpConfigSource).toBe(join(home, ".claude.json"));
    });

    test("resolves destination paths relative to home directory", () => {
      const home = homedir();
      const paths = resolveSyncPaths("user");

      expect(paths.agentsOverrideDest).toBe(
        join(home, ".codex", "AGENTS.override.md"),
      );
      expect(paths.codexSkillsDir).toBe(join(home, ".agents", "skills"));
      expect(paths.codexAgentsDir).toBe(join(home, ".codex", "agents"));
      expect(paths.codexConfigDir).toBe(join(home, ".codex"));
    });
  });

  describe("project scope", () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = mkdtempSync(join(tmpdir(), "path-resolver-test-"));
    });

    afterEach(() => {
      rmSync(tempDir, { recursive: true, force: true });
    });

    test("resolves source paths relative to provided cwd", () => {
      const paths = resolveSyncPaths("project", tempDir);

      expect(paths.claudeMdSource).toBe(join(tempDir, "CLAUDE.md"));
      expect(paths.pluginScanRoot).toBe(tempDir);
      expect(paths.standaloneSkillsDir).toBe(
        join(tempDir, ".claude", "skills"),
      );
      expect(paths.commandsDir).toBe(
        join(tempDir, ".claude", "commands"),
      );
      expect(paths.standaloneAgentsDir).toBe(
        join(tempDir, ".claude", "agents"),
      );
      expect(paths.mcpConfigSource).toBe(join(tempDir, ".mcp.json"));
    });

    test("resolves destination paths relative to provided cwd", () => {
      const paths = resolveSyncPaths("project", tempDir);

      expect(paths.agentsOverrideDest).toBe(
        join(tempDir, "AGENTS.override.md"),
      );
      expect(paths.codexSkillsDir).toBe(join(tempDir, ".agents", "skills"));
      expect(paths.codexAgentsDir).toBe(join(tempDir, ".codex", "agents"));
      expect(paths.codexConfigDir).toBe(join(tempDir, ".codex"));
    });

    test("creates destination directories if they don't exist", () => {
      const paths = resolveSyncPaths("project", tempDir);

      expect(existsSync(paths.codexSkillsDir)).toBe(true);
      expect(existsSync(paths.codexAgentsDir)).toBe(true);
      expect(existsSync(paths.codexConfigDir)).toBe(true);
    });
  });
});
