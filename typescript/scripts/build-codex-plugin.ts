#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveSkillSyncPath(): string {
  return (
    process.env.SKILL_SYNC ??
    join(homedir(), "github", "skill-sync", "bin", "skill-sync.mjs")
  );
}

function getRepoRoot(): string {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  return join(scriptDir, "..", "..");
}

export function buildCodexPlugin(
  sourcePluginDir: string,
  codexPluginDir: string,
  options?: { skillSyncPath?: string; override?: boolean },
): void {
  const skillSyncPath = options?.skillSyncPath ?? resolveSkillSyncPath();
  if (!existsSync(skillSyncPath)) {
    throw new Error(
      `skill-sync not found at ${skillSyncPath}. Set SKILL_SYNC to the launcher path or install skill-sync at ~/github/skill-sync.`,
    );
  }

  const args = [
    "plugin",
    "--from",
    sourcePluginDir,
    "--to",
    codexPluginDir,
  ];
  if (options?.override !== false) {
    args.push("--override");
  }

  const result = spawnSync("node", [skillSyncPath, ...args], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    throw new Error(
      `skill-sync plugin failed (exit ${result.status ?? "unknown"}) for ${sourcePluginDir}`,
    );
  }
}

if (import.meta.main) {
  const repoRoot = getRepoRoot();
  buildCodexPlugin(
    join(repoRoot, "claude", "ai-resources-plugin"),
    join(repoRoot, "plugins", "ai-resources"),
  );
  buildCodexPlugin(
    join(repoRoot, "claude", "agentic-engineering-principles-plugin"),
    join(repoRoot, "plugins", "agentic-engineering-principles"),
  );
}
