import { mkdirSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { SyncPaths } from "./types.ts";

export function resolveSyncPaths(
  scope: "user" | "project",
  cwd: string = process.cwd(),
): SyncPaths {
  const paths =
    scope === "user" ? resolveUserPaths() : resolveProjectPaths(cwd);

  ensureDir(paths.codexSkillsDir);
  ensureDir(paths.codexAgentsDir);
  ensureDir(paths.codexConfigDir);

  return paths;
}

function resolveUserPaths(): SyncPaths {
  const home = homedir();
  return {
    scope: "user",
    claudeMdSource: join(home, ".claude", "CLAUDE.md"),
    pluginScanRoot: join(home, ".claude", "plugins"),
    standaloneAgentsDir: join(home, ".claude", "agents"),
    mcpConfigSource: join(home, ".claude.json"),
    agentsOverrideDest: join(home, ".codex", "AGENTS.override.md"),
    codexSkillsDir: join(home, ".agents", "skills"),
    codexAgentsDir: join(home, ".codex", "agents"),
    codexConfigDir: join(home, ".codex"),
  };
}

function resolveProjectPaths(cwd: string): SyncPaths {
  return {
    scope: "project",
    claudeMdSource: join(cwd, "CLAUDE.md"),
    pluginScanRoot: cwd,
    standaloneAgentsDir: join(cwd, ".claude", "agents"),
    mcpConfigSource: join(cwd, ".mcp.json"),
    agentsOverrideDest: join(cwd, "AGENTS.override.md"),
    codexSkillsDir: join(cwd, ".agents", "skills"),
    codexAgentsDir: join(cwd, ".codex", "agents"),
    codexConfigDir: join(cwd, ".codex"),
    installedPluginsDir: join(homedir(), ".claude", "plugins"),
  };
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}
