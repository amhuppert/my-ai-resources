import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import type { ResolvedFileRef } from "../types.js";

export interface CleanupService {
  cleanup(
    text: string,
    contextFiles: ResolvedFileRef[],
    instructionsFiles: ResolvedFileRef[],
  ): Promise<string>;
}

const SOURCE_LABELS: Record<ResolvedFileRef["source"], string> = {
  global: "Global",
  local: "Project",
  specified: "Config",
  cli: "Custom",
};

function buildFileSections(
  files: ResolvedFileRef[],
  type: "context" | "additional-instructions",
): string {
  const sections: string[] = [];

  for (const file of files) {
    if (!existsSync(file.path)) continue;
    try {
      const content = readFileSync(file.path, "utf-8");
      const label = SOURCE_LABELS[file.source];
      const tagPrefix = label.toLowerCase();
      sections.push(
        `${label} ${type === "context" ? "Context" : "Additional Instructions"}:\n<${tagPrefix}-${type}>\n${content}\n</${tagPrefix}-${type}>`,
      );
    } catch {
      // Silently skip unreadable files
    }
  }

  return sections.length > 0 ? sections.join("\n\n") + "\n\n" : "";
}

const CLEANUP_PROMPT_TEMPLATE = `You are cleaning up voice-transcribed text for use as instructions to AI agents.

{CONTEXT_SECTION}Transcribed Text:
<transcription>
{TRANSCRIPTION}
</transcription>

Instructions:
1. Fix obvious transcription errors and typos
2. Improve clarity and readability
3. Add appropriate markdown formatting
4. Structure as paragraphs or bulleted lists as appropriate
5. Do not add information not present in the original
6. Output ONLY the cleaned text, no explanations or preamble

{INSTRUCTIONS_SECTION}`;

export function createCleanupService(model?: string): CleanupService {
  return {
    async cleanup(
      text: string,
      contextFiles: ResolvedFileRef[],
      instructionsFiles: ResolvedFileRef[],
    ): Promise<string> {
      const contextSection = buildFileSections(contextFiles, "context");
      const instructionsSection = buildFileSections(
        instructionsFiles,
        "additional-instructions",
      );

      const prompt = CLEANUP_PROMPT_TEMPLATE.replace(
        "{CONTEXT_SECTION}",
        contextSection,
      )
        .replace("{INSTRUCTIONS_SECTION}", instructionsSection)
        .replace("{TRANSCRIPTION}", text);

      return runClaudeCli(prompt, text, model);
    },
  };
}

function runClaudeCli(
  prompt: string,
  fallbackText: string,
  model?: string,
): Promise<string> {
  return new Promise((resolve) => {
    const args = ["-p", prompt];
    if (model) {
      args.push("--model", model);
    }

    console.log(
      `Running: claude ${args.map((a) => (a === prompt ? "<prompt>" : a)).join(" ")}`,
    );

    const child = spawn("claude", args, {
      timeout: 60000,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err: Error) => {
      console.error(`Claude CLI error: ${err.message}`);
      resolve(fallbackText);
    });

    child.on("close", (code: number | null) => {
      if (code !== 0) {
        console.error(`Claude CLI exited with code ${code}: ${stderr}`);
        resolve(fallbackText);
        return;
      }
      resolve(stdout.trim() || fallbackText);
    });
  });
}
