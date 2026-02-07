#!/usr/bin/env bun

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import {
  printInstallationHeader,
  installDirectory,
  installClaudeMd,
  execCommand,
  commandExists,
} from "@/lib/installer-utils.js";
import { installHook } from "@/scripts/install-hooks.js";
import {
  type CommandExecutor,
  type InstallConfig,
  createDefaultConfig,
  createDefaultExecutor,
} from "@/lib/install-types.js";

/**
 * Get the directory where this script is located
 */
function getScriptDir(): string {
  // When compiled, __dirname will point to the compiled location
  // We need to go up to the repository root
  const scriptPath = import.meta.url;
  const scriptFile = fileURLToPath(scriptPath);
  const scriptDir = dirname(scriptFile);

  // If we're in dist/, go up one level, then up one more to get to repo root
  // If we're running from source in scripts/, go up one level to typescript/, then up again
  const repoRoot = join(scriptDir, "..", "..");
  return repoRoot;
}

/**
 * Main installation function
 */
async function main(
  config: InstallConfig,
  executor: CommandExecutor,
): Promise<void> {
  const SCRIPT_DIR = getScriptDir();

  printInstallationHeader("project-level", SCRIPT_DIR);

  // 1. cursor/rules -> .cursor/rules in current working directory
  await installDirectory(
    join(SCRIPT_DIR, "cursor", "rules"),
    config.paths.cursorRulesDir,
    `Syncing cursor/rules -> ${config.paths.cursorRulesDir}`,
    config,
    executor,
  );

  // 2. cursor/commands -> .cursor/commands in current working directory
  await installDirectory(
    join(SCRIPT_DIR, "cursor", "commands"),
    config.paths.cursorCommandsDir,
    `Syncing cursor/commands -> ${config.paths.cursorCommandsDir}`,
    config,
    executor,
  );

  // 3. claude/CLAUDE-project.md -> CLAUDE.md in current working directory
  const projectClaudeFile = join(process.cwd(), "CLAUDE.md");
  await installClaudeMd(
    join(SCRIPT_DIR, "claude", "CLAUDE-project.md"),
    projectClaudeFile,
    `Installing project-level CLAUDE.md -> ${projectClaudeFile}`,
  );

  // 4. Install notification hook if audio file exists
  const notificationFile = join(
    config.paths.projectClaudeDir,
    "notification.mp3",
  );

  if (existsSync(notificationFile)) {
    console.log("Installing notification hook for .claude/notification.mp3");
    if (await commandExists("bun", executor)) {
      try {
        installHook(
          "Notification",
          "*",
          "ffplay -nodisp -autoexit -loglevel quiet ./.claude/notification.mp3 < /dev/null",
          config,
          "command",
          5,
          true,
        );
        console.log("Notification hook installed successfully");
      } catch (error) {
        console.log("Warning: Failed to install notification hook");
        console.error(error);
      }
    } else {
      console.log(
        "Warning: bun not found, skipping notification hook installation",
      );
      console.log("Install bun to enable hook installation: https://bun.sh");
    }
  } else {
    console.log(
      "No .claude/notification.mp3 found, skipping notification hook installation",
    );
  }

  console.log("");
  console.log("project-level installation complete!");
}

// CLI interface
if (import.meta.main) {
  try {
    const config = createDefaultConfig();
    const executor = createDefaultExecutor();
    await main(config, executor);
  } catch (error) {
    console.error("Error during project-level installation:", error);
    process.exit(1);
  }
}

export { main };
