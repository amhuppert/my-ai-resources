import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";
import type { SyncItemResult } from "./types.ts";

export function syncInstructions(
  sourcePath: string,
  destPath: string,
): SyncItemResult {
  if (!existsSync(sourcePath)) {
    console.warn(`Source instructions not found: ${sourcePath}`);
    return {
      artifact: "instructions",
      status: "skipped",
      reason: `Source file not found: ${sourcePath}`,
    };
  }

  const destDir = dirname(destPath);
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }

  const content = readFileSync(sourcePath, "utf-8");
  writeFileSync(destPath, content);

  return {
    artifact: "instructions",
    status: "synced",
    destPath,
  };
}
