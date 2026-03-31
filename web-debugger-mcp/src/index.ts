#!/usr/bin/env bun

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GetLogsInputSchema, GetSnapshotInputSchema, ListProvidersInputSchema } from "./schemas/tools.js";
import { getLogs } from "./tools/get-logs.js";
import { getSnapshotTool } from "./tools/get-snapshot.js";
import { listProvidersTool } from "./tools/list-providers.js";
import { getOutputDir } from "./lib/session.js";
import { startWsServer } from "./lib/ws-server.js";

const DEFAULT_PORT = 7600;

const server = new McpServer({
  name: "web-debugger",
  version: "1.0.0",
});

server.registerTool("get_logs", {
  title: "Get Logs",
  description:
    "Returns the path to the current session's log file (JSONL format). " +
    "Each line is a JSON object with timestamp, level, source, message, and optional context.",
  inputSchema: GetLogsInputSchema.shape,
}, async () => {
  const result = getLogs();
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: "error" in result,
  };
});

server.registerTool("get_snapshot", {
  title: "Get Snapshot",
  description:
    "Requests a state snapshot from a registered provider. " +
    "Returns the path to a JSON file containing the snapshot data. " +
    "Use list_providers to see available providers.",
  inputSchema: GetSnapshotInputSchema.shape,
}, async ({ provider }) => {
  const outputDir = getOutputDir();
  const result = await getSnapshotTool(provider, outputDir);
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    isError: "error" in result,
  };
});

server.registerTool("list_providers", {
  title: "List Providers",
  description:
    "Lists all registered state providers. " +
    "Each provider has a name and source (browser or server).",
  inputSchema: ListProvidersInputSchema.shape,
}, async () => {
  const result = listProvidersTool();
  return {
    content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
  };
});

async function main(): Promise<void> {
  const port = parseInt(process.env.WEB_DEBUGGER_PORT ?? String(DEFAULT_PORT));
  const outputDir = getOutputDir();

  startWsServer(port, outputDir);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("[web-debugger] MCP server running on stdio");
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch((error) => {
    console.error("[web-debugger] Server startup error:", error);
    process.exit(1);
  });
}
