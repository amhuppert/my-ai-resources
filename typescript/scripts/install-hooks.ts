#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { Command } from "commander";
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

// CLI interface
if (import.meta.main) {
  const program = new Command();

  program
    .name("install-hooks")
    .description("Install a hook to Claude Code settings")
    .argument("<hook-type>", "Hook event type (e.g., Notification, ToolCall)")
    .argument("<matcher>", "Hook matcher pattern")
    .argument("<command>", "Command to execute")
    .option("--project", "Install to project-level settings")
    .option("--user", "Install to user-level settings (default)")
    .option("--type <type>", "Hook type", "command")
    .option("--timeout <seconds>", "Timeout in seconds", parseInt)
    .action(
      (
        hookType: string,
        matcher: string,
        command: string,
        options: {
          project?: boolean;
          user?: boolean;
          type: string;
          timeout?: number;
        },
      ) => {
        try {
          // Validate hook type
          const validHookTypes = HookEventSchema.options;
          if (!validHookTypes.includes(hookType as HookEvent)) {
            throw new Error(
              `Invalid hook type: ${hookType}. Must be one of: ${validHookTypes.join(", ")}`,
            );
          }

          // Validate hook type value
          const typeValue = options.type as HookType;
          if (typeValue !== "command") {
            throw new Error(
              `Invalid type value: ${typeValue}. Must be "command"`,
            );
          }

          // Determine scope (--project takes precedence)
          const isProject = options.project === true;

          // Install the hook
          installHook(
            hookType as HookEvent,
            matcher,
            command,
            typeValue,
            options.timeout,
            isProject,
          );
        } catch (error) {
          console.error("Error installing hook:", error);
          process.exit(1);
        }
      },
    );

  program.parse();
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
};
