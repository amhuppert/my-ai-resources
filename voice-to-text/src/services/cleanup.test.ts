import { describe, test, expect } from "bun:test";
import { EventEmitter } from "node:events";
import { createCleanupService, type SpawnFn } from "./cleanup.js";

interface SpawnCall {
  command: string;
  args: string[];
  options: { timeout?: number; stdio: Array<string> };
}

function createMockSpawn(opts?: {
  stdoutData?: string;
  exitCode?: number;
  shouldError?: boolean;
}): { spawnFn: SpawnFn; calls: SpawnCall[] } {
  const {
    stdoutData = "cleaned text",
    exitCode = 0,
    shouldError = false,
  } = opts ?? {};
  const calls: SpawnCall[] = [];

  const spawnFn = ((
    command: string,
    args: string[],
    options: { timeout?: number; stdio: Array<string> },
  ) => {
    calls.push({ command, args, options });

    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();

    queueMicrotask(() => {
      if (shouldError) {
        child.emit("error", new Error("spawn failed"));
      } else {
        child.stdout.emit("data", Buffer.from(stdoutData));
        child.emit("close", exitCode);
      }
    });

    return child;
  }) as unknown as SpawnFn;

  return { spawnFn, calls };
}

describe("createCleanupService", () => {
  test("passes --model flag when model is provided", async () => {
    const { spawnFn, calls } = createMockSpawn();
    const service = createCleanupService("haiku", false, spawnFn);

    await service.cleanup("test input", [], [], []);

    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe("claude");
    const modelIndex = calls[0].args.indexOf("--model");
    expect(modelIndex).toBeGreaterThan(-1);
    expect(calls[0].args[modelIndex + 1]).toBe("haiku");
  });

  test("omits --model flag when model is undefined", async () => {
    const { spawnFn, calls } = createMockSpawn();
    const service = createCleanupService(undefined, false, spawnFn);

    await service.cleanup("test input", [], [], []);

    expect(calls).toHaveLength(1);
    expect(calls[0].args).not.toContain("--model");
  });

  test("returns cleaned text from stdout", async () => {
    const { spawnFn } = createMockSpawn({ stdoutData: "cleaned output" });
    const service = createCleanupService(undefined, false, spawnFn);

    const result = await service.cleanup("test input", [], [], []);

    expect(result.text).toBe("cleaned output");
  });

  test("falls back to raw text on non-zero exit code", async () => {
    const { spawnFn } = createMockSpawn({ exitCode: 1 });
    const service = createCleanupService(undefined, false, spawnFn);

    const result = await service.cleanup("raw input", [], [], []);

    expect(result.text).toBe("raw input");
  });

  test("falls back to raw text on spawn error", async () => {
    const { spawnFn } = createMockSpawn({ shouldError: true });
    const service = createCleanupService(undefined, false, spawnFn);

    const result = await service.cleanup("raw input", [], [], []);

    expect(result.text).toBe("raw input");
  });

  test("prompt contains transcription in correct tags", async () => {
    const { spawnFn, calls } = createMockSpawn();
    const service = createCleanupService(undefined, false, spawnFn);

    await service.cleanup("hello world", [], [], []);

    const prompt = calls[0].args[1];
    expect(prompt).toContain("<transcription>\nhello world\n</transcription>");
  });

  test("uses file mode template when priorOutput is provided", async () => {
    const { spawnFn, calls } = createMockSpawn();
    const service = createCleanupService(undefined, false, spawnFn);

    await service.cleanup("test", [], [], [], "prior text");

    const prompt = calls[0].args[1];
    expect(prompt).toContain("<prior-output>\nprior text\n</prior-output>");
    expect(prompt).toContain("continue from where this ends");
  });

  test("spawn options include timeout and stdio config", async () => {
    const { spawnFn, calls } = createMockSpawn();
    const service = createCleanupService(undefined, false, spawnFn);

    await service.cleanup("test input", [], [], []);

    expect(calls[0].options.timeout).toBe(60000);
    expect(calls[0].options.stdio).toEqual(["ignore", "pipe", "pipe"]);
  });
});
