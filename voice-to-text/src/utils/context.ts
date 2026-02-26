import { readFileSync, existsSync } from "node:fs";
import type { ResolvedFileRef } from "../types.js";

const TRANSCRIPTION_BASE = "Accurately transcribe the spoken audio.";

export function buildTranscriptionPrompt(
  vocabularyFiles: ResolvedFileRef[],
): string {
  const terms: string[] = [];
  const seen = new Set<string>();

  for (const file of vocabularyFiles) {
    if (!existsSync(file.path)) continue;
    try {
      const content = readFileSync(file.path, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          terms.push(trimmed);
        }
      }
    } catch {
      // Silently skip unreadable files
    }
  }

  if (terms.length === 0) return TRANSCRIPTION_BASE;
  return `${TRANSCRIPTION_BASE} Domain vocabulary: ${terms.join(", ")}.`;
}
