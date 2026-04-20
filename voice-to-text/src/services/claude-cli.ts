import { spawn, type ChildProcess } from "node:child_process";

export type SpawnFn = (
  command: string,
  args: string[],
  options: { timeout?: number; stdio: Array<string> },
) => ChildProcess;

function buildDisplayArgs(args: string[]): string {
  const display: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (
      (args[i] === "-p" || args[i] === "--system-prompt") &&
      i + 1 < args.length
    ) {
      display.push(args[i], `<${args[i + 1].length} chars>`);
      i++;
    } else {
      display.push(args[i]);
    }
  }
  return display.join(" ");
}

export function runClaudeCli(
  prompt: string,
  fallbackText: string,
  systemPrompt: string,
  model?: string,
  verbose?: boolean,
  spawnFn: SpawnFn = spawn as unknown as SpawnFn,
  logPrefix = "cleanup",
): Promise<string> {
  return new Promise((resolve) => {
    const args = [
      "-p",
      prompt,
      "--tools",
      "",
      "--system-prompt",
      systemPrompt,
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers": {}}',
    ];
    if (model) {
      args.push("--model", model);
    }

    if (verbose) {
      console.error(`[${logPrefix}] Spawning: claude ${buildDisplayArgs(args)}`);
    }

    const startTime = Date.now();

    const child = spawnFn("claude", args, {
      timeout: 60000,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout!.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    child.stderr!.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    child.on("error", (err: Error) => {
      const elapsed = Date.now() - startTime;
      if (verbose) {
        console.error(
          `[${logPrefix}] Spawn error after ${elapsed}ms: ${err.message}`,
        );
      }
      console.error(`Claude CLI error: ${err.message}`);
      resolve(fallbackText);
    });

    child.on("close", (code: number | null) => {
      const elapsed = Date.now() - startTime;
      if (verbose) {
        if (code !== 0) {
          console.error(
            `[${logPrefix}] Failed in ${elapsed}ms (exit code: ${code})`,
          );
        } else {
          console.error(
            `[${logPrefix}] Completed in ${elapsed}ms (exit code: ${code})`,
          );
        }
      }
      if (code !== 0) {
        console.error(`Claude CLI exited with code ${code}: ${stderr}`);
        resolve(fallbackText);
        return;
      }
      resolve(stdout.trim() || fallbackText);
    });
  });
}
