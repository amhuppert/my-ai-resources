import { loadOrCreateSyncConfig } from "./sync-config.ts";
import { resolveSyncPaths } from "./path-resolver.ts";
import { runSync } from "./sync-orchestrator.ts";
import { printSyncSummary } from "./sync-reporter.ts";

interface CodexSyncOptions {
  scope: "user" | "project";
  cwd?: string;
  configPath: string;
}

export function runCodexSync(options: CodexSyncOptions): number {
  const { scope, configPath, cwd } = options;

  let config;
  try {
    config = loadOrCreateSyncConfig(configPath);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Config error: ${message}`);
    return 1;
  }

  try {
    const paths = resolveSyncPaths(scope, cwd);
    const result = runSync(paths, config);
    printSyncSummary(result);

    return result.hasErrors ? 1 : 0;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Sync error: ${message}`);
    return 1;
  }
}
