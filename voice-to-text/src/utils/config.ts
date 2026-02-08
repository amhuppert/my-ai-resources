import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve, dirname } from "node:path";
import {
  ConfigSchema,
  type Config,
  type ResolvedFileRef,
  type ResolvedConfig,
  type ConfigSource,
  type ConfigResolution,
} from "../types.js";

const CONFIG_DIR = join(homedir(), ".config", "voice-to-text");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
const LOCAL_CONFIG_NAME = "voice.json";

export function loadConfigFile(path: string): Config {
  const raw = readFileSync(path, "utf-8");
  const parsed = JSON.parse(raw);
  return ConfigSchema.parse(parsed);
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    return ConfigSchema.parse({});
  }

  try {
    return loadConfigFile(CONFIG_PATH);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Invalid JSON in config file: ${CONFIG_PATH}`);
    } else if (error instanceof Error) {
      console.error(`Config validation error: ${error.message}`);
    }
    return ConfigSchema.parse({});
  }
}

export function loadLocalConfig(): Config | null {
  const localPath = join(process.cwd(), LOCAL_CONFIG_NAME);
  if (!existsSync(localPath)) {
    return null;
  }

  try {
    return loadConfigFile(localPath);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Warning: Invalid JSON in ${localPath}, skipping`);
    } else if (error instanceof Error) {
      console.error(
        `Warning: Config validation error in ${localPath}: ${error.message}, skipping`,
      );
    }
    return null;
  }
}

function resolveFilePath(filePath: string, baseDir: string): string {
  return resolve(baseDir, filePath);
}

export function resolveConfig(options: {
  configPath?: string;
  cliOpts: Partial<Config>;
}): ConfigResolution {
  const loadedFrom: ConfigSource[] = [];

  // Layer 1 (lowest priority): global config
  const globalConfig = loadConfig();
  loadedFrom.push({
    layer: "global",
    path: CONFIG_PATH,
    found: existsSync(CONFIG_PATH),
  });

  // Layer 2: local voice.json
  const localConfig = loadLocalConfig();
  loadedFrom.push({
    layer: "local",
    path: join(process.cwd(), LOCAL_CONFIG_NAME),
    found: localConfig !== null,
  });

  // Layer 3: --config <path> file
  let specifiedConfig: Config | null = null;
  if (options.configPath) {
    if (!existsSync(options.configPath)) {
      console.error(`Error: Config file not found: ${options.configPath}`);
      process.exit(1);
    }
    try {
      specifiedConfig = loadConfigFile(options.configPath);
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error(`Invalid JSON in config file: ${options.configPath}`);
        process.exit(1);
      }
      console.error(
        `Config validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      process.exit(1);
    }
    loadedFrom.push({
      layer: "specified",
      path: resolve(options.configPath),
      found: true,
    });
  }

  // --- Accumulate context/instructions files ---
  const FILE_KEYS = ["contextFile", "instructionsFile"] as const;

  function collectFiles(
    field: "contextFile" | "instructionsFile",
  ): ResolvedFileRef[] {
    // CLI overrides all layers
    if (options.cliOpts[field] !== undefined) {
      return [
        {
          path: resolveFilePath(options.cliOpts[field]!, process.cwd()),
          source: "cli",
        },
      ];
    }

    const files: ResolvedFileRef[] = [];
    const seen = new Set<string>();

    const layers: {
      config: Config | null;
      source: ResolvedFileRef["source"];
      baseDir: string;
    }[] = [
      { config: globalConfig, source: "global", baseDir: CONFIG_DIR },
      { config: localConfig, source: "local", baseDir: process.cwd() },
      {
        config: specifiedConfig,
        source: "specified",
        baseDir: options.configPath
          ? dirname(resolve(options.configPath))
          : process.cwd(),
      },
    ];

    for (const layer of layers) {
      if (!layer.config) continue;
      const value = layer.config[field];
      if (!value) continue;
      const resolved = resolveFilePath(value, layer.baseDir);
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      files.push({ path: resolved, source: layer.source });
    }

    return files;
  }

  const contextFiles = collectFiles("contextFile");
  const instructionsFiles = collectFiles("instructionsFile");

  // --- Per-key merge for remaining fields (unchanged logic, skip file fields) ---
  const merged: Record<string, unknown> = { ...globalConfig };

  for (const layer of [localConfig, specifiedConfig]) {
    if (!layer) continue;
    for (const key of Object.keys(layer) as (keyof Config)[]) {
      if (
        layer[key] !== undefined &&
        !FILE_KEYS.includes(key as (typeof FILE_KEYS)[number])
      ) {
        merged[key] = layer[key];
      }
    }
  }

  // Layer 4 (highest priority): CLI args
  for (const key of Object.keys(options.cliOpts) as (keyof Config)[]) {
    if (
      options.cliOpts[key] !== undefined &&
      !FILE_KEYS.includes(key as (typeof FILE_KEYS)[number])
    ) {
      merged[key] = options.cliOpts[key];
    }
  }

  const parsed = ConfigSchema.parse(merged);

  return {
    config: {
      ...parsed,
      contextFiles,
      instructionsFiles,
    },
    loadedFrom,
  };
}

export function mergeConfig(
  fileConfig: Config,
  cliOpts: Partial<Config>,
): Config {
  const merged = { ...fileConfig };
  for (const key of Object.keys(cliOpts) as (keyof Config)[]) {
    if (cliOpts[key] !== undefined) {
      (merged as Record<string, unknown>)[key] = cliOpts[key];
    }
  }
  return ConfigSchema.parse(merged);
}

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getAssetsDir(): string {
  return join(CONFIG_DIR, "assets");
}
