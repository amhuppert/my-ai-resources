import { readFileSync, existsSync } from "node:fs";
import type { ResolvedFileRef } from "../types.js";

const TRANSCRIPTION_INSTRUCTIONS = "Accurately transcribe the spoken audio.";

const TRANSCRIPTION_INSTRUCTIONS_WITH_CONTEXT =
  "Accurately transcribe the spoken audio. The context below contains domain-specific terminology, names, and phrases to help you recognize words correctly. Use it only as hints for accurate transcription—do not alter, add to, or reinterpret what was actually spoken.";

export function readContextFilesContent(
  files: ResolvedFileRef[],
): string | undefined {
  const contents: string[] = [];
  for (const file of files) {
    if (!existsSync(file.path)) continue;
    try {
      const content = readFileSync(file.path, "utf-8").trim();
      if (content) contents.push(content);
    } catch {
      // Silently skip unreadable files
    }
  }
  if (contents.length === 0) return TRANSCRIPTION_INSTRUCTIONS;
  return `${TRANSCRIPTION_INSTRUCTIONS_WITH_CONTEXT}\n\n<context>\n${contents.join("\n\n")}\n</context>`;
}
