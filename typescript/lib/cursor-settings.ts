import { existsSync, readFileSync, writeFileSync } from "fs";
import { homedir, platform } from "os";
import { join } from "path";
import { parse as parseJsonc } from "jsonc-parser";

interface JsonSchemaEntry {
  fileMatch: string[];
  url: string;
}

export function getCursorSettingsPath(): string {
  const home = homedir();

  switch (platform()) {
    case "darwin":
      return join(
        home,
        "Library",
        "Application Support",
        "Cursor",
        "User",
        "settings.json",
      );
    case "win32": {
      const appData = process.env.APPDATA;
      if (!appData) {
        throw new Error("APPDATA environment variable not found on Windows");
      }
      return join(appData, "Cursor", "User", "settings.json");
    }
    case "linux":
      return join(home, ".config", "Cursor", "User", "settings.json");
    default:
      throw new Error(`Unsupported platform: ${platform()}`);
  }
}

/**
 * Add or update a JSON schema association in Cursor's user settings.
 * Matches existing entries by fileMatch overlap to avoid duplicates.
 */
export function installCursorJsonSchema(
  schemaUrl: string,
  fileMatch: string[],
): void {
  const settingsPath = getCursorSettingsPath();

  if (!existsSync(settingsPath)) {
    console.log(
      `  Warning: Cursor settings not found at ${settingsPath}. Skipping schema registration.`,
    );
    return;
  }

  const raw = readFileSync(settingsPath, "utf-8");
  const settings = parseJsonc(raw) as Record<string, unknown> | undefined;
  if (typeof settings !== "object" || settings === null) {
    console.log(
      "  Warning: Could not parse Cursor settings.json. Skipping schema registration.",
    );
    return;
  }

  const schemas: JsonSchemaEntry[] = Array.isArray(settings["json.schemas"])
    ? (settings["json.schemas"] as JsonSchemaEntry[])
    : [];

  const existingIndex = schemas.findIndex(
    (s) =>
      Array.isArray(s.fileMatch) &&
      s.fileMatch.some((m) => fileMatch.includes(m)),
  );

  const entry: JsonSchemaEntry = { fileMatch, url: schemaUrl };

  if (existingIndex >= 0) {
    schemas[existingIndex] = entry;
  } else {
    schemas.push(entry);
  }

  settings["json.schemas"] = schemas;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}
