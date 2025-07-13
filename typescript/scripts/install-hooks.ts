#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { deepMerge } from "@/scripts/install-settings.js";
import type {
  HookEvent,
  HookType,
  HookConfig,
  HookMatcher,
  Hooks,
  ClaudeCodeSettings,
} from "@/lib/claude-code-settings.js";
import {
  ClaudeCodeSettingsSchema,
  HookEventSchema,
  HookTypeSchema,
} from "@/lib/claude-code-settings.js";

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
  hookType: HookEvent,
  matcher: string,
  command: string,
  type: HookType = "command",
  timeout?: number,
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
    ...(timeout !== undefined && { timeout }),
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
      "Usage: bun run install-hooks.ts <hook-type> <matcher> <command> [--project|--user] [--type=command] [--timeout=5]",
    );
  }

  const hookType = args[0] as HookEvent;
  const matcher = args[1];
  const command = args[2];

  // Validate hook type
  const validHookTypes = HookEventSchema.options;
  if (!validHookTypes.includes(hookType)) {
    throw new Error(
      `Invalid hook type: ${hookType}. Must be one of: ${validHookTypes.join(", ")}`,
    );
  }

  // Parse options
  let isProject = false;
  let type: HookType = "command";
  let timeout: number | undefined = undefined;

  for (let i = 3; i < args.length; i++) {
    const arg = args[i]!; // Safe because we're within bounds

    if (arg === "--project") {
      isProject = true;
    } else if (arg === "--user") {
      isProject = false;
    } else if (arg.startsWith("--type=")) {
      const parts = arg.split("=");
      if (parts.length !== 2 || !parts[1]) {
        throw new Error("Invalid --type option format. Use --type=command");
      }
      const typeValue = parts[1] as HookType;
      if (typeValue !== "command") {
        throw new Error(`Invalid type value: ${typeValue}. Must be "command"`);
      }
      type = typeValue;
    } else if (arg.startsWith("--timeout=")) {
      const parts = arg.split("=");
      if (parts.length !== 2 || !parts[1]) {
        throw new Error("Invalid --timeout option format. Use --timeout=5");
      }
      const timeoutValue = parseInt(parts[1], 10);
      if (isNaN(timeoutValue) || timeoutValue <= 0) {
        throw new Error(
          `Invalid timeout value: ${parts[1]}. Must be a positive number in seconds`,
        );
      }
      timeout = timeoutValue;
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
