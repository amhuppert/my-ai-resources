import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { OutputMode } from "../types.js";

const LAST_TRANSCRIPTION_FILENAME = ".voice-last.json";

export interface LastTranscription {
  text: string;
  timestamp: number;
  mode: OutputMode;
}

export interface LastTranscriptionService {
  save(text: string, mode: OutputMode): void;
  load(): LastTranscription | null;
}

export function createLastTranscriptionService(): LastTranscriptionService {
  const filePath = join(process.cwd(), LAST_TRANSCRIPTION_FILENAME);

  return {
    save(text: string, mode: OutputMode): void {
      const data: LastTranscription = {
        text,
        timestamp: Date.now(),
        mode,
      };
      try {
        writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(`Failed to save last transcription: ${msg}`);
      }
    },

    load(): LastTranscription | null {
      if (!existsSync(filePath)) return null;
      try {
        return JSON.parse(readFileSync(filePath, "utf-8"));
      } catch {
        return null;
      }
    },
  };
}
