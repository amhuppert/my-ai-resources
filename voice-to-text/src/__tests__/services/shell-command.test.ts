import {
  describe,
  expect,
  test,
  beforeEach,
  afterEach,
  spyOn,
  mock,
} from "bun:test";
import { EventEmitter } from "node:events";
import type { ResolvedFileRef } from "../../types.js";

let fsFiles: Record<string, string> = {};
let spawnCalls: { command: string; args: string[] }[] = [];
let spawnBehavior: {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  error?: Error;
} = { stdout: "", stderr: "", exitCode: 0 };

mock.module("node:fs", () => ({
  existsSync: (path: string) => path in fsFiles,
  readFileSync: (path: string, _encoding: string) => {
    if (path in fsFiles) return fsFiles[path];
    throw new Error(`ENOENT: no such file: ${path}`);
  },
}));

mock.module("node:child_process", () => ({
  spawn: (command: string, args: string[], _opts: Record<string, unknown>) => {
    spawnCalls.push({ command, args });

    const child = new EventEmitter();
    const stdout = new EventEmitter();
    const stderr = new EventEmitter();
    (child as unknown as Record<string, unknown>)["stdout"] = stdout;
    (child as unknown as Record<string, unknown>)["stderr"] = stderr;

    queueMicrotask(() => {
      if (spawnBehavior.error) {
        child.emit("error", spawnBehavior.error);
        return;
      }
      if (spawnBehavior.stdout) {
        stdout.emit("data", Buffer.from(spawnBehavior.stdout));
      }
      if (spawnBehavior.stderr) {
        stderr.emit("data", Buffer.from(spawnBehavior.stderr));
      }
      child.emit("close", spawnBehavior.exitCode);
    });

    return child;
  },
}));

const { createShellCommandService } = await import(
  "../../services/shell-command.js"
);

const FALLBACK = "# Could not generate command: claude CLI error";

function findArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  return idx >= 0 ? args[idx + 1] : undefined;
}

describe("ShellCommandService", () => {
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    fsFiles = {};
    spawnCalls = [];
    spawnBehavior = { stdout: "ls -la", stderr: "", exitCode: 0 };
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe("prompt construction", () => {
    test("prompt wraps transcription in <transcription> tags", async () => {
      const svc = createShellCommandService();
      const result = await svc.generate(
        "list files",
        [],
        [],
        [],
        "linux",
      );
      expect(result.prompt).toContain("<transcription>");
      expect(result.prompt).toContain("list files");
      expect(result.prompt).toContain("</transcription>");
    });

    test("context files produce source-labeled XML sections", async () => {
      fsFiles["/ctx/global.md"] = "global shell ctx";
      const contextFiles: ResolvedFileRef[] = [
        { path: "/ctx/global.md", source: "global" },
      ];

      const svc = createShellCommandService();
      const result = await svc.generate("cmd", contextFiles, [], [], "linux");

      expect(result.prompt).toContain("<global-context>");
      expect(result.prompt).toContain("global shell ctx");
      expect(result.prompt).toContain("</global-context>");
    });

    test("vocabulary files produce source-labeled XML sections", async () => {
      fsFiles["/vocab/local.txt"] = "kubectl\ndocker";
      const vocabFiles: ResolvedFileRef[] = [
        { path: "/vocab/local.txt", source: "local" },
      ];

      const svc = createShellCommandService();
      const result = await svc.generate("cmd", [], vocabFiles, [], "linux");

      expect(result.prompt).toContain("<project-vocabulary>");
      expect(result.prompt).toContain("kubectl");
      expect(result.prompt).toContain("</project-vocabulary>");
    });

    test("instructions files produce additional-instructions XML sections", async () => {
      fsFiles["/instr/cli.md"] = "use long flags";
      const instrFiles: ResolvedFileRef[] = [
        { path: "/instr/cli.md", source: "cli" },
      ];

      const svc = createShellCommandService();
      const result = await svc.generate("cmd", [], [], instrFiles, "linux");

      expect(result.prompt).toContain("<custom-additional-instructions>");
      expect(result.prompt).toContain("use long flags");
    });

    test("system prompt contains linux OS directive when os=linux", async () => {
      const svc = createShellCommandService();
      await svc.generate("cmd", [], [], [], "linux");

      const systemPrompt = findArgValue(spawnCalls[0].args, "--system-prompt");
      expect(systemPrompt).toBeDefined();
      expect(systemPrompt!).toContain("TARGET OS: linux");
    });

    test("system prompt contains macos OS directive when os=macos", async () => {
      const svc = createShellCommandService();
      await svc.generate("cmd", [], [], [], "macos");

      const systemPrompt = findArgValue(spawnCalls[0].args, "--system-prompt");
      expect(systemPrompt).toBeDefined();
      expect(systemPrompt!).toContain("TARGET OS: macos");
    });

    test("system prompt instructs raw-command-only output", async () => {
      const svc = createShellCommandService();
      await svc.generate("cmd", [], [], [], "linux");

      const systemPrompt = findArgValue(spawnCalls[0].args, "--system-prompt");
      expect(systemPrompt!).toMatch(/raw shell command/i);
    });
  });

  describe("CLI spawning", () => {
    test("spawns claude with tool-disabling flags", async () => {
      const svc = createShellCommandService();
      await svc.generate("cmd", [], [], [], "linux");

      expect(spawnCalls).toHaveLength(1);
      expect(spawnCalls[0].command).toBe("claude");
      expect(spawnCalls[0].args).toContain("--tools");
      expect(spawnCalls[0].args).toContain("--strict-mcp-config");
      expect(spawnCalls[0].args).toContain("--mcp-config");
      expect(spawnCalls[0].args).toContain('{"mcpServers": {}}');
      expect(spawnCalls[0].args).toContain("-p");
      expect(spawnCalls[0].args).toContain("--system-prompt");
    });

    test("passes --model when model is provided", async () => {
      const svc = createShellCommandService("claude-haiku-4-5-20251001");
      await svc.generate("cmd", [], [], [], "linux");

      expect(spawnCalls[0].args).toContain("--model");
      expect(spawnCalls[0].args).toContain("claude-haiku-4-5-20251001");
    });

    test("omits --model when model is undefined", async () => {
      const svc = createShellCommandService();
      await svc.generate("cmd", [], [], [], "linux");

      expect(spawnCalls[0].args).not.toContain("--model");
    });

    test("returns trimmed stdout as text", async () => {
      spawnBehavior = {
        stdout: "  find . -name '*.md'  \n",
        stderr: "",
        exitCode: 0,
      };
      const svc = createShellCommandService();
      const result = await svc.generate("cmd", [], [], [], "linux");
      expect(result.text).toBe("find . -name '*.md'");
    });

    test("falls back to error marker on spawn error", async () => {
      spawnBehavior = {
        stdout: "",
        stderr: "",
        exitCode: 0,
        error: new Error("spawn failed"),
      };
      const svc = createShellCommandService();
      const result = await svc.generate("cmd", [], [], [], "linux");
      expect(result.text).toBe(FALLBACK);
    });

    test("falls back to error marker on non-zero exit code", async () => {
      spawnBehavior = { stdout: "", stderr: "err", exitCode: 1 };
      const svc = createShellCommandService();
      const result = await svc.generate("cmd", [], [], [], "linux");
      expect(result.text).toBe(FALLBACK);
    });

    test("falls back to error marker on empty stdout", async () => {
      spawnBehavior = { stdout: "", stderr: "", exitCode: 0 };
      const svc = createShellCommandService();
      const result = await svc.generate("cmd", [], [], [], "linux");
      expect(result.text).toBe(FALLBACK);
    });
  });
});
