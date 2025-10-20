#!/usr/bin/env bun

import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { homedir } from "os";
import {
  printInstallationHeader,
  printInstallationFooter,
  installDirectory,
  installFile,
  installClaudeMd,
  execCommand,
  commandExists,
} from "@/lib/installer-utils.js";
import { installSettingsFromFile } from "@/scripts/install-settings.js";

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
async function main(): Promise<void> {
  const SCRIPT_DIR = getScriptDir();

  printInstallationHeader("user-level", SCRIPT_DIR);

  // 1. agent-docs -> ~/.claude/agent-docs
  await installDirectory(
    join(SCRIPT_DIR, "agent-docs"),
    join(homedir(), ".claude", "agent-docs"),
    "Syncing agent-docs -> ~/.claude/agent-docs"
  );

  // 2. claude/CLAUDE-user.md -> ~/.claude/CLAUDE.md
  await installClaudeMd(
    join(SCRIPT_DIR, "claude", "CLAUDE-user.md"),
    join(homedir(), ".claude", "CLAUDE.md"),
    "Installing claude/CLAUDE-user.md -> ~/.claude/CLAUDE.md"
  );

  // 3. Install scripts
  await installFile(
    join(SCRIPT_DIR, "scripts", "lgit"),
    join(homedir(), ".local", "bin", "lgit"),
    "Installing lgit -> ~/.local/bin/lgit",
    true
  );

  await installFile(
    join(SCRIPT_DIR, "scripts", "code-tree"),
    join(homedir(), ".local", "bin", "code-tree"),
    "Installing code-tree -> ~/.local/bin/code-tree",
    true
  );

  await installFile(
    join(SCRIPT_DIR, "scripts", "read-file"),
    join(homedir(), ".local", "bin", "read-file"),
    "Installing read-file -> ~/.local/bin/read-file",
    true
  );

  await installFile(
    join(SCRIPT_DIR, "scripts", "push-main"),
    join(homedir(), ".local", "bin", "push-main"),
    "Installing push-main -> ~/.local/bin/push-main",
    true
  );

  // 4. Install cursor-shortcuts-mcp globally
  console.log("Installing cursor-shortcuts-mcp globally...");
  const mcpDir = join(SCRIPT_DIR, "cursor-shortcuts-mcp");

  if (await commandExists("bun")) {
    try {
      console.log("Building cursor-shortcuts-mcp...");
      const buildResult = await execCommand("bun", ["run", "build"], {
        cwd: mcpDir,
      });

      if (!buildResult.success) {
        console.log("Warning: Failed to build cursor-shortcuts-mcp");
        console.error(buildResult.stderr);
      } else {
        console.log("Linking cursor-shortcuts-mcp globally...");
        const linkResult = await execCommand("bun", ["link"], {
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
      "Warning: bun not found, skipping cursor-shortcuts-mcp installation"
    );
    console.log(
      "Install bun to enable MCP server installation: https://bun.sh"
    );
  }

  // 5. Install Claude Code settings using TypeScript installer
  console.log("Installing Claude Code user-level settings...");
  if (await commandExists("bun")) {
    try {
      installSettingsFromFile(join(SCRIPT_DIR, "claude", "settings.json"));
      console.log("Claude Code settings installed successfully");
    } catch (error) {
      console.log("Warning: Failed to install Claude Code settings");
      console.error(error);
    }
  } else {
    console.log(
      "Warning: bun not found, skipping Claude Code settings installation"
    );
    console.log("Install bun to enable settings installation: https://bun.sh");
  }

  // 6. Install MCP servers for Claude Code
  console.log("Adding MCP servers to Claude Code");

  // Add cursor-shortcuts-mcp (globally linked via bun)
  const cursorShortcutsResult = await execCommand("claude", [
    "mcp",
    "add",
    "cursor-shortcuts",
    "cursor-shortcuts-mcp",
    "--scope",
    "user",
  ]);

  if (!cursorShortcutsResult.success) {
    console.log("Warning: Failed to add cursor-shortcuts MCP server");
    console.error(cursorShortcutsResult.stderr);
  }

  // Add Context7 MCP server
  const context7Result = await execCommand("claude", [
    "mcp",
    "add",
    "--transport",
    "sse",
    "context7",
    "https://mcp.context7.com/sse",
    "--scope",
    "user",
  ]);

  if (!context7Result.success) {
    console.log("Warning: Failed to add Context7 MCP server");
    console.error(context7Result.stderr);
  }

  // 7. Install Hooks
  console.log("Installing Hooks");
  console.log("Installing rins_hooks from fork");

  const rinsHooksPath = join(homedir(), "rins_hooks");

  // Clone the rins_hooks fork if it doesn't exist
  const rinsHooksExists = await Bun.file(rinsHooksPath).exists();

  if (!rinsHooksExists) {
    console.log("Cloning rins_hooks fork...");
    const cloneResult = await execCommand("git", [
      "clone",
      "https://github.com/amhuppert/rins_hooks.git",
      rinsHooksPath,
    ]);

    if (!cloneResult.success) {
      console.log("Warning: Failed to clone rins_hooks");
      console.error(cloneResult.stderr);
    }
  } else {
    console.log("rins_hooks fork already exists, updating...");
    const pullResult = await execCommand("git", ["pull"], {
      cwd: rinsHooksPath,
    });

    if (!pullResult.success) {
      console.log("Warning: Failed to update rins_hooks");
      console.error(pullResult.stderr);
    }
  }

  // Install globally with bun link
  console.log("Installing rins_hooks globally with bun link...");

  const installResult = await execCommand("bun", ["install"], {
    cwd: rinsHooksPath,
  });
  if (!installResult.success) {
    console.log("Warning: Failed to run bun install for rins_hooks");
    console.error(installResult.stderr);
  }

  const linkResult = await execCommand("bun", ["link"], { cwd: rinsHooksPath });
  if (!linkResult.success) {
    console.log("Warning: Failed to link rins_hooks");
    console.error(linkResult.stderr);
  }

  // 8. Install ai-workflow-resources plugin
  console.log("Installing ai-workflow-resources plugin...");

  const claudeDirPath = join(SCRIPT_DIR, "claude");

  // Add this repository as a plugin marketplace
  const marketplaceResult = await execCommand("claude", [
    "plugin",
    "marketplace",
    "add",
    claudeDirPath,
  ]);

  if (!marketplaceResult.success) {
    console.log("Warning: Failed to add plugin marketplace");
    console.error(marketplaceResult.stderr);
  } else {
    // Install the plugin from the local marketplace
    const pluginInstallResult = await execCommand("claude", [
      "plugin",
      "install",
      "ai-workflow-resources@ai-workflow-resources",
    ]);

    if (!pluginInstallResult.success) {
      console.log("Warning: Failed to install ai-workflow-resources plugin");
      console.error(pluginInstallResult.stderr);
    } else {
      console.log("ai-workflow-resources plugin installed successfully");
    }
  }

  printInstallationFooter("user-level");
}

// CLI interface
if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error("Error during user-level installation:", error);
    process.exit(1);
  }
}

export { main };
