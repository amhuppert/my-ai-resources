#!/usr/bin/env bun

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { validateSettings, parseSettings } from "@/lib/claude-code-settings.js";
import type { ClaudeCodeSettings } from "@/lib/claude-code-settings.js";

/**
 * Deep merge two objects
 * TODO: Use library like Remeda for this instead of custom implementation.
 */
function deepMerge(target: any, source: any): any {
  if (source === null || typeof source !== "object") {
    return source;
  }

  if (target === null || typeof target !== "object") {
    return source;
  }

  if (Array.isArray(source)) {
    return source;
  }

  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (
        typeof source[key] === "object" &&
        source[key] !== null &&
        !Array.isArray(source[key])
      ) {
        result[key] = deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }

  return result;
}

/**
 * Get Claude Code settings directory
 */
function getClaudeSettingsDir(): string {
  return join(homedir(), ".claude");
}

/**
 * Get Claude Code settings file path
 */
function getClaudeSettingsPath(): string {
  return join(getClaudeSettingsDir(), "settings.json");
}

/**
 * Load existing Claude Code settings
 */
function loadExistingSettings(): ClaudeCodeSettings | null {
  const settingsPath = getClaudeSettingsPath();

  if (!existsSync(settingsPath)) {
    return null;
  }

  try {
    const content = readFileSync(settingsPath, "utf-8");
    const parsed = JSON.parse(content);
    const result = parseSettings(parsed);

    if (result.success) {
      return result.data!;
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
function saveSettings(settings: ClaudeCodeSettings): void {
  const settingsDir = getClaudeSettingsDir();
  const settingsPath = getClaudeSettingsPath();

  // Ensure settings directory exists
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true });
  }

  // Validate settings before saving
  const validated = validateSettings(settings);

  // Write to file
  writeFileSync(settingsPath, JSON.stringify(validated, null, 2), "utf-8");
}

/**
 * Install settings from a source file
 */
function installSettingsFromFile(sourcePath: string): void {
  if (!existsSync(sourcePath)) {
    throw new Error(`Source settings file not found: ${sourcePath}`);
  }

  // Load source settings
  const sourceContent = readFileSync(sourcePath, "utf-8");
  const sourceParsed = JSON.parse(sourceContent);
  const sourceResult = parseSettings(sourceParsed);

  if (!sourceResult.success) {
    throw new Error(
      `Invalid source settings file: ${sourceResult.error?.issues}`
    );
  }

  const sourceSettings = sourceResult.data;

  // Load existing settings
  const existingSettings = loadExistingSettings();

  // Merge settings
  const mergedSettings = existingSettings
    ? deepMerge(existingSettings, sourceSettings)
    : sourceSettings;

  // Save merged settings
  saveSettings(mergedSettings);

  console.log(`Settings installed successfully to ${getClaudeSettingsPath()}`);
  if (existingSettings) {
    console.log("Settings were merged with existing configuration");
  } else {
    console.log("New settings file created");
  }
}

/**
 * Install settings from a settings object
 */
function installSettings(settings: ClaudeCodeSettings): void {
  // Load existing settings
  const existingSettings = loadExistingSettings();

  // Merge settings
  const mergedSettings = existingSettings
    ? deepMerge(existingSettings, settings)
    : settings;

  // Save merged settings
  saveSettings(mergedSettings);

  console.log(`Settings installed successfully to ${getClaudeSettingsPath()}`);
  if (existingSettings) {
    console.log("Settings were merged with existing configuration");
  } else {
    console.log("New settings file created");
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: bun run install-settings.ts <settings-file>");
    process.exit(1);
  }

  const sourcePath = args[0];

  if (!sourcePath) {
    console.error("Error: No settings file path provided");
    process.exit(1);
  }

  try {
    installSettingsFromFile(sourcePath);
  } catch (error) {
    console.error("Error installing settings:", error);
    process.exit(1);
  }
}

// Export functions for programmatic use
export {
  deepMerge,
  getClaudeSettingsDir,
  getClaudeSettingsPath,
  loadExistingSettings,
  saveSettings,
  installSettingsFromFile,
  installSettings,
};
