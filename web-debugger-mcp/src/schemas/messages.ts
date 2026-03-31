import { z } from "zod";

export const SourceSchema = z.enum(["browser", "server"]);
export type Source = z.infer<typeof SourceSchema>;

export const LogLevelSchema = z.enum(["info", "warn", "error", "debug"]);
export type LogLevel = z.infer<typeof LogLevelSchema>;

const ConnectMessageSchema = z.object({
  type: z.literal("connect"),
  source: SourceSchema,
});

const LogMessageSchema = z.object({
  type: z.literal("log"),
  level: LogLevelSchema,
  message: z.string(),
  context: z.record(z.unknown()).optional(),
  timestamp: z.string(),
});

export const ProviderNameSchema = z.string().min(1).regex(
  /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/,
  "Provider name must start with alphanumeric and contain only alphanumeric, hyphens, or underscores",
);

const RegisterProviderMessageSchema = z.object({
  type: z.literal("register_provider"),
  name: ProviderNameSchema,
});

const SnapshotResponseMessageSchema = z.object({
  type: z.literal("snapshot_response"),
  requestId: z.string(),
  name: z.string(),
  data: z.unknown(),
  error: z.string().optional(),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  ConnectMessageSchema,
  LogMessageSchema,
  RegisterProviderMessageSchema,
  SnapshotResponseMessageSchema,
]);
export type ClientMessage = z.infer<typeof ClientMessageSchema>;

export const SnapshotRequestMessageSchema = z.object({
  type: z.literal("snapshot_request"),
  requestId: z.string(),
  name: z.string(),
});
export type SnapshotRequestMessage = z.infer<typeof SnapshotRequestMessageSchema>;
