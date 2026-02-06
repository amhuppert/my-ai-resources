import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

export interface CleanupService {
  cleanup(text: string, contextFilePath?: string): Promise<string>;
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
6. Output ONLY the cleaned text, no explanations or preamble`;

export function createCleanupService(model?: string): CleanupService {
  return {
    async cleanup(text: string, contextFilePath?: string): Promise<string> {
      let contextSection = "";

      if (contextFilePath && existsSync(contextFilePath)) {
        try {
          const contextContent = readFileSync(contextFilePath, "utf-8");
          contextSection = `Project Context:
<context>
${contextContent}
</context>

`;
        } catch {
          // Ignore context file errors, proceed without context
        }
      }

      const prompt = CLEANUP_PROMPT_TEMPLATE.replace(
        "{CONTEXT_SECTION}",
        contextSection,
      ).replace("{TRANSCRIPTION}", text);

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
