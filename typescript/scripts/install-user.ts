#!/usr/bin/env bun

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  printInstallationHeader,
  installDirectory,
  installFile,
  execCommand,
  commandExists,
} from "@/lib/installer-utils.js";
import { installSettingsFromFile } from "@/scripts/install-settings.js";
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

  printInstallationHeader("user-level", SCRIPT_DIR);

  // 1. agent-docs -> ~/.claude/agent-docs
  await installDirectory(
    join(SCRIPT_DIR, "agent-docs"),
    join(config.paths.userClaudeDir, "agent-docs"),
    `Syncing agent-docs -> ${config.paths.userClaudeDir}/agent-docs`,
    config,
    executor,
  );

  // 2. Install scripts
  await installFile(
    join(SCRIPT_DIR, "scripts", "lgit"),
    join(config.paths.userLocalBin, "lgit"),
    `Installing lgit -> ${config.paths.userLocalBin}/lgit`,
    config,
    executor,
    true,
  );

  await installFile(
    join(SCRIPT_DIR, "scripts", "code-tree"),
    join(config.paths.userLocalBin, "code-tree"),
    `Installing code-tree -> ${config.paths.userLocalBin}/code-tree`,
    config,
    executor,
    true,
  );

  await installFile(
    join(SCRIPT_DIR, "scripts", "read-file"),
    join(config.paths.userLocalBin, "read-file"),
    `Installing read-file -> ${config.paths.userLocalBin}/read-file`,
    config,
    executor,
    true,
  );

  await installFile(
    join(SCRIPT_DIR, "scripts", "push-main"),
    join(config.paths.userLocalBin, "push-main"),
    `Installing push-main -> ${config.paths.userLocalBin}/push-main`,
    config,
    executor,
    true,
  );

  // 3. Install cursor-shortcuts-mcp globally
  console.log("Installing cursor-shortcuts-mcp globally...");
  const mcpDir = join(SCRIPT_DIR, "cursor-shortcuts-mcp");

  if (await commandExists("bun", executor)) {
    try {
      console.log("Building cursor-shortcuts-mcp...");
      const buildResult = await execCommand("bun", ["run", "build"], executor, {
        cwd: mcpDir,
      });

      if (!buildResult.success) {
        console.log("Warning: Failed to build cursor-shortcuts-mcp");
        console.error(buildResult.stderr);
      } else {
        console.log("Linking cursor-shortcuts-mcp globally...");
        const linkResult = await execCommand("bun", ["link"], executor, {
          cwd: mcpDir,
        });

        if (!linkResult.success) {
          console.log("Warning: Failed to link cursor-shortcuts-mcp");
          console.error(linkResult.stderr);
        } else {
          console.log("cursor-shortcuts-mcp installed successfully");
        }
      }
    } catch (error) {
      console.log("Warning: Failed to install cursor-shortcuts-mcp");
      console.error(error);
    }
  } else {
    console.log(
      "Warning: bun not found, skipping cursor-shortcuts-mcp installation",
    );
    console.log(
      "Install bun to enable MCP server installation: https://bun.sh",
    );
  }

  // 4. Install Claude Code settings using TypeScript installer
  console.log("Installing Claude Code user-level settings...");
  if (await commandExists("bun", executor)) {
    try {
      installSettingsFromFile(
        join(SCRIPT_DIR, "claude", "settings.json"),
        config,
      );
      console.log("Claude Code settings installed successfully");
    } catch (error) {
      console.log("Warning: Failed to install Claude Code settings");
      console.error(error);
    }
  } else {
    console.log(
      "Warning: bun not found, skipping Claude Code settings installation",
    );
    console.log("Install bun to enable settings installation: https://bun.sh");
  }

  // 5. Install MCP servers for Claude Code
  console.log("Adding MCP servers to Claude Code");

  // Add cursor-shortcuts-mcp (globally linked via bun)
  const cursorShortcutsResult = await execCommand(
    "claude",
    [
      "mcp",
      "add",
      "cursor-shortcuts",
      "cursor-shortcuts-mcp",
      "--scope",
      "user",
    ],
    executor,
  );

  if (!cursorShortcutsResult.success) {
    console.log("Warning: Failed to add cursor-shortcuts MCP server");
    console.error(cursorShortcutsResult.stderr);
  }

  // Add Context7 MCP server
  const context7Result = await execCommand(
    "claude",
    [
      "mcp",
      "add",
      "--transport",
      "sse",
      "context7",
      "https://mcp.context7.com/sse",
      "--scope",
      "user",
    ],
    executor,
  );

  if (!context7Result.success) {
    console.log("Warning: Failed to add Context7 MCP server");
    console.error(context7Result.stderr);
  }

  // 6. Install Hooks
  console.log("Installing Hooks");
  console.log("Installing rins_hooks from fork");

  const rinsHooksPath = config.paths.userRinsHooks;

  // Clone the rins_hooks fork if it doesn't exist
  const rinsHooksExists = await Bun.file(rinsHooksPath).exists();

  if (!rinsHooksExists) {
    console.log("Cloning rins_hooks fork...");
    const cloneResult = await execCommand(
      "git",
      ["clone", "https://github.com/amhuppert/rins_hooks.git", rinsHooksPath],
      executor,
    );

    if (!cloneResult.success) {
      console.log("Warning: Failed to clone rins_hooks");
      console.error(cloneResult.stderr);
    }
  } else {
    console.log("rins_hooks fork already exists, updating...");
    const pullResult = await execCommand("git", ["pull"], executor, {
      cwd: rinsHooksPath,
    });

    if (!pullResult.success) {
      console.log("Warning: Failed to update rins_hooks");
      console.error(pullResult.stderr);
    }
  }

  // Install globally with bun link
  console.log("Installing rins_hooks globally with bun link...");

  const installResult = await execCommand("bun", ["install"], executor, {
    cwd: rinsHooksPath,
  });
  if (!installResult.success) {
    console.log("Warning: Failed to run bun install for rins_hooks");
    console.error(installResult.stderr);
  }

  const linkResult = await execCommand("bun", ["link"], executor, {
    cwd: rinsHooksPath,
  });
  if (!linkResult.success) {
    console.log("Warning: Failed to link rins_hooks");
    console.error(linkResult.stderr);
  }

  // 7. Install ai-workflow-resources plugin
  console.log("Installing ai-workflow-resources plugin...");

  const marketplacePath = join(SCRIPT_DIR, "claude");

  // Add this repository as a plugin marketplace
  const marketplaceResult = await execCommand(
    "claude",
    ["plugin", "marketplace", "add", marketplacePath],
    executor,
  );

  if (!marketplaceResult.success) {
    console.log("Warning: Failed to add plugin marketplace");
    console.error(marketplaceResult.stderr);
  } else {
    // Install the plugin from the local marketplace
    const pluginInstallResult = await execCommand(
      "claude",
      ["plugin", "install", "ai-resources@ai-resources"],
      executor,
    );

    if (!pluginInstallResult.success) {
      console.log("Warning: Failed to install ai-resources plugin");
      console.error(pluginInstallResult.stderr);
    } else {
      console.log("ai-resources plugin installed successfully");
    }
  }

  console.log("");
  console.log("user-level installation complete!");
}

// CLI interface
if (import.meta.main) {
  try {
    const config = createDefaultConfig();
    const executor = createDefaultExecutor();
    await main(config, executor);
  } catch (error) {
    console.error("Error during user-level installation:", error);
    process.exit(1);
  }
}

export { main };
