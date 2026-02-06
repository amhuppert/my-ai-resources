import { readFileSync } from "node:fs";
import OpenAI from "openai";

export interface Transcriber {
  transcribe(audioFilePath: string): Promise<string>;
}

export function createTranscriber(apiKey: string): Transcriber {
  const client = new OpenAI({ apiKey });

  return {
    async transcribe(audioFilePath: string): Promise<string> {
      const audioBuffer = readFileSync(audioFilePath);
      const audioFile = new File([audioBuffer], "audio.wav", {
        type: "audio/wav",
      });

      const response = await client.audio.transcriptions.create({
        model: "gpt-4o-transcribe",
        file: audioFile,
        response_format: "text",
      });

      return response;
    },
  };
}
