import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { SyncConfigSchema, DEFAULT_SYNC_CONFIG } from "./schemas.ts";
import type { SyncConfig } from "./types.ts";

export function loadOrCreateSyncConfig(configPath: string): SyncConfig {
  if (!existsSync(configPath)) {
    const dir = dirname(configPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(configPath, JSON.stringify(DEFAULT_SYNC_CONFIG, null, 2));
    console.log(`Created default sync config at ${configPath}`);
    return { ...DEFAULT_SYNC_CONFIG };
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);
  const result = SyncConfigSchema.parse(parsed);
  return result as SyncConfig;
}
