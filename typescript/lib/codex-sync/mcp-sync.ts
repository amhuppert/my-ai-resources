import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";
import { parse as tomlParse, stringify as tomlStringify } from "smol-toml";
import type { SyncItemResult } from "./types.ts";
import { McpConfigSchema, StdioMcpServerSchema, HttpMcpServerSchema } from "./schemas.ts";

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

  const results: SyncItemResult[] = [];
  const entriesToWrite: Record<string, Record<string, unknown>> = {};

  for (const [id, serverRaw] of Object.entries(mcpServers)) {
    const serverType = (serverRaw as Record<string, unknown>)["type"];
    if (serverType === "sse") {
      results.push({
        artifact: `mcp:${id}`,
        status: "skipped",
        reason: "SSE transport not supported by Codex CLI",
      });
      continue;
    }

    const stdioResult = StdioMcpServerSchema.safeParse(serverRaw);
    if (stdioResult.success) {
      const entry: Record<string, unknown> = { command: stdioResult.data.command };
      if (stdioResult.data.args) {
        entry["args"] = stdioResult.data.args;
      }
      if (stdioResult.data.env && Object.keys(stdioResult.data.env).length > 0) {
        entry["env"] = stdioResult.data.env;
      }
      entriesToWrite[id] = entry;
      continue;
    }

    const httpResult = HttpMcpServerSchema.safeParse(serverRaw);
    if (httpResult.success) {
      const entry: Record<string, unknown> = { url: httpResult.data.url };
      if (httpResult.data.headers && Object.keys(httpResult.data.headers).length > 0) {
        entry["http_headers"] = httpResult.data.headers;
      }
      entriesToWrite[id] = entry;
      continue;
    }

    results.push({
      artifact: `mcp:${id}`,
      status: "skipped",
      reason: "Unrecognized MCP server format (no command or url)",
    });
  }

  if (Object.keys(entriesToWrite).length === 0) {
    return results;
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
      results.push({
        artifact: "mcp",
        status: "failed",
        reason: `Invalid existing TOML in ${configPath}: ${message}`,
      });
      return results;
    }
  }

  const mcpSection =
    (existingConfig["mcp_servers"] as Record<string, unknown> | undefined) ??
    {};
  const nextMcpSection = { ...mcpSection, ...entriesToWrite };

  existingConfig["mcp_servers"] = nextMcpSection;

  try {
    if (!existsSync(codexConfigDir)) {
      mkdirSync(codexConfigDir, { recursive: true });
    }

    writeFileSync(configPath, tomlStringify(existingConfig));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    results.push({
      artifact: "mcp",
      status: "failed",
      reason: `Could not write ${configPath}: ${message}`,
    });
    return results;
  }

  for (const id of Object.keys(entriesToWrite)) {
    results.push({
      artifact: `mcp:${id}`,
      status: "synced",
      destPath: configPath,
    });
  }

  return results;
}
