import { z } from "zod";
import type { SyncConfig } from "./types.ts";

export const SyncConfigSchema = z
  .object({
    modelMapping: z.record(z.string()),
    exclude: z.array(z.string()).optional(),
  })
  .passthrough();

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  modelMapping: {
    sonnet: "gpt-5.4",
    opus: "gpt-5.4",
    haiku: "gpt-5.3-codex-spark",
  },
};

export const SkillFrontmatterSchema = z
  .object({
    name: z.string(),
    description: z.string(),
  })
  .passthrough();

export const AgentFrontmatterSchema = z
  .object({
    name: z.string(),
    description: z.string(),
    model: z.string().optional(),
  })
  .passthrough();

export const StdioMcpServerSchema = z
  .object({
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
  })
  .passthrough();

export const HttpMcpServerSchema = z
  .object({
    url: z.string(),
    type: z.string().optional(),
    headers: z.record(z.string()).optional(),
  })
  .passthrough();

export const McpConfigSchema = z
  .object({
    mcpServers: z.record(z.record(z.unknown())).optional(),
  })
  .passthrough();
