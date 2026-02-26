import { z } from "zod";

export const ConfigSchema = z.object({
  hotkey: z.string().default("F9"),
  fileHotkey: z.string().default("F10"),
  contextFile: z.string().optional(),
  vocabularyFile: z.string().optional(),
  instructionsFile: z.string().optional(),
  outputFile: z.string().optional(),
  claudeModel: z.string().optional(),
  autoInsert: z.boolean().default(true),
  beepEnabled: z.boolean().default(true),
  notificationEnabled: z.boolean().default(true),
  terminalOutputEnabled: z.boolean().default(true),
  maxRecordingDuration: z.number().default(300),
});

export type Config = z.infer<typeof ConfigSchema>;

export type ResolvedFileRef = {
  path: string;
  source: "global" | "local" | "specified" | "cli";
};

export type OutputMode = "clipboard" | "file";

export type ResolvedConfig = Config & {
  contextFiles: ResolvedFileRef[];
  vocabularyFiles: ResolvedFileRef[];
  instructionsFiles: ResolvedFileRef[];
  resolvedOutputFile?: string;
};

export type ConfigSource = {
  layer: "global" | "local" | "specified";
  path: string;
  found: boolean;
};

export type ConfigResolution = {
  config: ResolvedConfig;
  loadedFrom: ConfigSource[];
};

export type AppStatus = "idle" | "recording" | "processing";

export interface AppState {
  status: AppStatus;
  recordingStartTime: number | null;
  audioFilePath: string | null;
  outputMode: OutputMode | null;
}

// Server types

export interface ServerConfig {
  port: number;
  host: string;
}

export interface TranscribeResponse {
  text: string;
}

export interface TranscribeErrorResponse {
  error: string;
}

export interface HealthResponse {
  status: "ok";
  version: string;
}
