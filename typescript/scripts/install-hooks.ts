#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { deepMerge } from "@/scripts/install-settings.js";
import type {
  HookConfig,
  HookMatcher,
  Hooks,
  ClaudeCodeSettings,
} from "@/lib/claude-code-settings.js";
import { ClaudeCodeSettingsSchema } from "@/lib/claude-code-settings.js";

/**
 * Get Claude Code settings directory for project-level
 */
function getProjectClaudeSettingsDir(): string {
  return join(process.cwd(), ".claude");
}

/**
 * Get Claude Code settings directory for user-level
 */
function getUserClaudeSettingsDir(): string {
  return join(homedir(), ".claude");
}

/**
 * Get Claude Code settings file path
 */
function getClaudeSettingsPath(isProject: boolean): string {
  const dir = isProject
    ? getProjectClaudeSettingsDir()
    : getUserClaudeSettingsDir();
  return join(dir, "settings.local.json");
}

/**
 * Load existing Claude Code settings
 */
function loadExistingHookSettings(
  isProject: boolean,
): ClaudeCodeSettings | null {
  const settingsPath = getClaudeSettingsPath(isProject);

  if (!existsSync(settingsPath)) {
    return null;
  }

  try {
    const content = readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content);
    const result = ClaudeCodeSettingsSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      console.warn("Existing settings file is invalid, will be replaced");
      console.warn("Validation errors:", result.error?.issues);
      return null;
    }
  } catch (error) {
    console.warn("Failed to load existing settings:", error);
    return null;
  }
}

/**
 * Save settings to Claude Code settings file
 */
function saveHookSettings(
  settings: ClaudeCodeSettings,
  isProject: boolean,
): void {
  const settingsDir = isProject
    ? getProjectClaudeSettingsDir()
    : getUserClaudeSettingsDir();
  const settingsPath = getClaudeSettingsPath(isProject);

  // Ensure settings directory exists
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }

  // Validate settings before saving
  const validated = ClaudeCodeSettingsSchema.parse(settings);

  // Write to file
  writeFileSync(settingsPath, JSON.stringify(validated, null, 2), "utf-8");
}

/**
 * Check if hook already exists to avoid duplicates
 */
function hookExists(
  hooks: HookMatcher[],
  matcher: string,
  command: string,
): boolean {
  return hooks.some(
    (hook) =>
      hook.matcher === matcher && hook.hooks.some((h) => h.command === command),
  );
}

/**
 * Install a hook to Claude Code settings
 */
function installHook(
  hookType: keyof Hooks,
  matcher: string,
  command: string,
  type: string = "shell",
  timeout: number = 5000,
  isProject: boolean = false,
): void {
  // Load existing settings
  const existingSettings = loadExistingHookSettings(isProject);

  // Create base settings if none exist
  const baseSettings: ClaudeCodeSettings = existingSettings || {};

  // Ensure hooks object exists
  if (!baseSettings.hooks) {
    baseSettings.hooks = {};
  }

  // Ensure the specific hook type array exists
  if (!baseSettings.hooks[hookType]) {
    baseSettings.hooks[hookType] = [];
  }

  const hookArray = baseSettings.hooks[hookType]!;

  // Check if hook already exists
  if (hookExists(hookArray, matcher, command)) {
    console.log(
      `Hook already exists for ${hookType} with matcher "${matcher}" and command "${command}"`,
    );
    return;
  }

  // Create new hook config
  const newHookConfig: HookConfig = {
    type,
    command,
    timeout,
  };

  // Find existing matcher or create new one
  let matcherConfig = hookArray.find((h) => h.matcher === matcher);

  if (matcherConfig) {
    // Add to existing matcher
    matcherConfig.hooks.push(newHookConfig);
  } else {
    // Create new matcher
    matcherConfig = {
      matcher,
      hooks: [newHookConfig],
    };
    hookArray.push(matcherConfig);
  }

  // Save updated settings
  saveHookSettings(baseSettings, isProject);

  const scope = isProject ? "project-level" : "user-level";
  const settingsPath = getClaudeSettingsPath(isProject);
  console.log(
    `Hook installed successfully to ${scope} settings: ${settingsPath}`,
  );
  console.log(`Added ${hookType} hook with matcher "${matcher}"`);
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]) {
  if (args.length < 3) {
    throw new Error(
      "Usage: bun run install-hooks.ts <hook-type> <matcher> <command> [--project|--user] [--type=shell] [--timeout=5000]",
    );
  }

  const hookType = args[0] as keyof Hooks;
  const matcher = args[1];
  const command = args[2];

  // Validate hook type
  if (!["Notification", "PostToolUse"].includes(hookType)) {
    throw new Error(
      `Invalid hook type: ${hookType}. Must be "Notification" or "PostToolUse"`,
    );
  }

  // Parse options
  let isProject = false;
  let type = "shell";
  let timeout = 5000;

  for (let i = 3; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--project") {
      isProject = true;
    } else if (arg === "--user") {
      isProject = false;
    } else if (arg.startsWith("--type=")) {
      type = arg.split("=")[1];
    } else if (arg.startsWith("--timeout=")) {
      timeout = parseInt(arg.split("=")[1], 10);
      if (isNaN(timeout)) {
        throw new Error(`Invalid timeout value: ${arg.split("=")[1]}`);
      }
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  return { hookType, matcher, command, type, timeout, isProject };
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);

  try {
    const { hookType, matcher, command, type, timeout, isProject } =
      parseArgs(args);
    installHook(hookType, matcher, command, type, timeout, isProject);
  } catch (error) {
    console.error("Error installing hook:", error);
    process.exit(1);
  }
}

// Export functions for programmatic use
export {
  getProjectClaudeSettingsDir,
  getUserClaudeSettingsDir,
  getClaudeSettingsPath,
  loadExistingHookSettings,
  saveHookSettings,
  installHook,
  hookExists,
  parseArgs,
};
