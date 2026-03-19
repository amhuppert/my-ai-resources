import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { parse as tomlParse, stringify as tomlStringify } from "smol-toml";
import type { SyncItemResult } from "./types.ts";
import { McpConfigSchema } from "./schemas.ts";

export function syncMcpServers(
  mcpSourcePath: string,
  codexConfigDir: string,
): SyncItemResult[] {
  if (!existsSync(mcpSourcePath)) {
    console.info(`MCP config not found: ${mcpSourcePath}, skipping`);
    return [];
  }

  const raw = readFileSync(mcpSourcePath, "utf-8");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [
      {
        artifact: "mcp",
        status: "failed",
        reason: `Invalid JSON in ${mcpSourcePath}`,
      },
    ];
  }

  const validated = McpConfigSchema.safeParse(parsed);
  if (!validated.success) {
    return [
      {
        artifact: "mcp",
        status: "failed",
        reason: `Schema validation failed: ${validated.error.message}`,
      },
    ];
  }

  const { mcpServers } = validated.data;
  if (!mcpServers || Object.keys(mcpServers).length === 0) {
    console.info("No MCP servers found in source config, skipping");
    return [];
  }

  const configPath = join(codexConfigDir, "config.toml");

  let existingConfig: Record<string, unknown> = {};
  if (existsSync(configPath)) {
    try {
      existingConfig = tomlParse(
        readFileSync(configPath, "utf-8"),
      ) as Record<string, unknown>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return [
        {
          artifact: "mcp",
          status: "failed",
          reason: `Invalid existing TOML in ${configPath}: ${message}`,
        },
      ];
    }
  }

  const mcpSection =
    (existingConfig["mcp_servers"] as Record<string, unknown> | undefined) ??
    {};
  const nextMcpSection = { ...mcpSection };

  for (const [id, server] of Object.entries(mcpServers)) {
    const entry: Record<string, unknown> = { command: server.command };

    if (server.args) {
      entry["args"] = server.args;
    }

    if (server.env && Object.keys(server.env).length > 0) {
      entry["env"] = server.env;
    }

    nextMcpSection[id] = entry;
  }

  existingConfig["mcp_servers"] = nextMcpSection;

  try {
    if (!existsSync(codexConfigDir)) {
      mkdirSync(codexConfigDir, { recursive: true });
    }

    writeFileSync(configPath, tomlStringify(existingConfig));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return [
      {
        artifact: "mcp",
        status: "failed",
        reason: `Could not write ${configPath}: ${message}`,
      },
    ];
  }

  return Object.keys(mcpServers).map((id) => ({
    artifact: `mcp:${id}`,
    status: "synced" as const,
    destPath: configPath,
  }));
}
