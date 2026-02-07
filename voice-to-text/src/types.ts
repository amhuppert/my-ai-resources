import { z } from "zod";

export const ConfigSchema = z.object({
  hotkey: z.string().default("F9"),
  contextFile: z.string().optional(),
  instructionsFile: z.string().optional(),
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

export type ResolvedConfig = Config & {
  contextFiles: ResolvedFileRef[];
  instructionsFiles: ResolvedFileRef[];
};

export type AppStatus = "idle" | "recording" | "processing";

export interface AppState {
  status: AppStatus;
  recordingStartTime: number | null;
  audioFilePath: string | null;
}
