import type { SyncResult } from "./types.ts";

export function printSyncSummary(result: SyncResult): void {
  const synced = result.items.filter((i) => i.status === "synced");
  const skipped = result.items.filter((i) => i.status === "skipped");
  const failed = result.items.filter((i) => i.status === "failed");
  const warnings = result.items.flatMap((item) =>
    (item.warnings ?? []).map((warning) => ({
      artifact: item.artifact,
      warning,
    })),
  );

  console.log(
    `\nSync complete: ${synced.length} synced, ${skipped.length} skipped, ${failed.length} failed`,
  );

  if (synced.length > 0) {
    console.log("\nWritten:");
    for (const item of synced) {
      console.log(
        `  ${item.artifact}: ${item.destPath ?? "(destination unavailable)"}`,
      );
    }
  }

  if (skipped.length > 0) {
    console.log("\nSkipped:");
    for (const item of skipped) {
      console.log(`  ${item.artifact}: ${item.reason}`);
    }
  }

  if (failed.length > 0) {
    console.log("\nFailed:");
    for (const item of failed) {
      console.log(`  ${item.artifact}: ${item.reason}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\nWarnings:");
    for (const item of warnings) {
      console.log(`  ${item.artifact}: ${item.warning}`);
    }
  }
}
