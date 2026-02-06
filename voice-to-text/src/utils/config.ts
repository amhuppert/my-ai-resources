import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { ConfigSchema, type Config } from "../types.js";

const CONFIG_DIR = join(homedir(), ".config", "voice-to-text");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return ConfigSchema.parse({});
  }

  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return ConfigSchema.parse(parsed);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Invalid JSON in config file: ${CONFIG_PATH}`);
    } else if (error instanceof Error) {
      console.error(`Config validation error: ${error.message}`);
    }
    return ConfigSchema.parse({});
  }
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getAssetsDir(): string {
  return join(CONFIG_DIR, "assets");
}
