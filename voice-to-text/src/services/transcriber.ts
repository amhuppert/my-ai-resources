import { readFileSync } from "node:fs";
import { extname } from "node:path";
import OpenAI from "openai";

export interface Transcriber {
  transcribe(audioFilePath: string, prompt?: string): Promise<string>;
}

const MIME_MAP: Record<string, { mime: string; filename: string }> = {
  ".wav": { mime: "audio/wav", filename: "audio.wav" },
  ".webm": { mime: "audio/webm", filename: "audio.webm" },
  ".mp3": { mime: "audio/mpeg", filename: "audio.mp3" },
  ".ogg": { mime: "audio/ogg", filename: "audio.ogg" },
  ".flac": { mime: "audio/flac", filename: "audio.flac" },
  ".m4a": { mime: "audio/mp4", filename: "audio.m4a" },
};

const DEFAULT_MIME = { mime: "audio/wav", filename: "audio.wav" };

export function getMimeInfo(filePath: string): { mime: string; filename: string } {
  const ext = extname(filePath).toLowerCase();
  return MIME_MAP[ext] ?? DEFAULT_MIME;
}

export function createTranscriber(apiKey: string): Transcriber {
  const client = new OpenAI({ apiKey });

  return {
    async transcribe(audioFilePath: string, prompt?: string): Promise<string> {
      const audioBuffer = readFileSync(audioFilePath);
      const { mime, filename } = getMimeInfo(audioFilePath);
      const audioFile = new File([audioBuffer], filename, { type: mime });

      const response = await client.audio.transcriptions.create({
        model: "gpt-4o-transcribe",
        file: audioFile,
        response_format: "text",
        ...(prompt ? { prompt } : {}),
      });

      return response;
    },
  };
}
