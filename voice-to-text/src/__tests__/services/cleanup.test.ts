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

// --- Mock state ---
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

    // Emit events asynchronously to mimic real spawn
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

const { createCleanupService } = await import("../../services/cleanup.js");

describe("CleanupService", () => {
  let errorSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    fsFiles = {};
    spawnCalls = [];
    spawnBehavior = { stdout: "", stderr: "", exitCode: 0 };
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe("prompt construction", () => {
    test("prompt includes <transcription> tags wrapping input text", async () => {
      spawnBehavior = { stdout: "cleaned", stderr: "", exitCode: 0 };
      const svc = createCleanupService();
      const result = await svc.cleanup("hello world", [], [], []);
      expect(result.prompt).toContain("<transcription>");
      expect(result.prompt).toContain("hello world");
      expect(result.prompt).toContain("</transcription>");
    });

    test("context files produce source-labeled XML tags", async () => {
      fsFiles["/ctx/global.md"] = "global context content";
      fsFiles["/ctx/local.md"] = "local context content";
      spawnBehavior = { stdout: "cleaned", stderr: "", exitCode: 0 };

      const contextFiles: ResolvedFileRef[] = [
        { path: "/ctx/global.md", source: "global" },
        { path: "/ctx/local.md", source: "local" },
      ];

      const svc = createCleanupService();
      const result = await svc.cleanup("text", contextFiles, [], []);

      expect(result.prompt).toContain("<global-context>");
      expect(result.prompt).toContain("global context content");
      expect(result.prompt).toContain("</global-context>");
      expect(result.prompt).toContain("<project-context>");
      expect(result.prompt).toContain("local context content");
      expect(result.prompt).toContain("</project-context>");
    });

    test("specified and cli context files produce correct tags", async () => {
      fsFiles["/ctx/spec.md"] = "specified content";
      fsFiles["/ctx/cli.md"] = "custom content";
      spawnBehavior = { stdout: "cleaned", stderr: "", exitCode: 0 };

      const contextFiles: ResolvedFileRef[] = [
        { path: "/ctx/spec.md", source: "specified" },
        { path: "/ctx/cli.md", source: "cli" },
      ];

      const svc = createCleanupService();
      const result = await svc.cleanup("text", contextFiles, [], []);

      expect(result.prompt).toContain("<config-context>");
      expect(result.prompt).toContain("specified content");
      expect(result.prompt).toContain("</config-context>");
      expect(result.prompt).toContain("<custom-context>");
      expect(result.prompt).toContain("custom content");
      expect(result.prompt).toContain("</custom-context>");
    });

    test("instructions files produce additional-instructions XML tags", async () => {
      fsFiles["/instr/global.md"] = "global instructions";
      fsFiles["/instr/local.md"] = "local instructions";
      spawnBehavior = { stdout: "cleaned", stderr: "", exitCode: 0 };

      const instrFiles: ResolvedFileRef[] = [
        { path: "/instr/global.md", source: "global" },
        { path: "/instr/local.md", source: "local" },
      ];

      const svc = createCleanupService();
      const result = await svc.cleanup("text", [], [], instrFiles);

      expect(result.prompt).toContain("<global-additional-instructions>");
      expect(result.prompt).toContain("global instructions");
      expect(result.prompt).toContain("</global-additional-instructions>");
      expect(result.prompt).toContain("<project-additional-instructions>");
      expect(result.prompt).toContain("local instructions");
      expect(result.prompt).toContain("</project-additional-instructions>");
    });

    test("missing files are silently skipped", async () => {
      // /nonexistent.md is not in fsFiles
      spawnBehavior = { stdout: "cleaned", stderr: "", exitCode: 0 };

      const contextFiles: ResolvedFileRef[] = [
        { path: "/nonexistent.md", source: "global" },
      ];

      const svc = createCleanupService();
      const result = await svc.cleanup("text", contextFiles, [], []);

      expect(result.prompt).not.toContain("<global-context>");
    });

    test("empty file arrays produce no context/instructions sections", async () => {
      spawnBehavior = { stdout: "cleaned", stderr: "", exitCode: 0 };
      const svc = createCleanupService();
      const result = await svc.cleanup("text", [], [], []);

      // Should not contain any context tags
      expect(result.prompt).not.toContain("-context>");
      expect(result.prompt).not.toContain("-additional-instructions>");
    });
  });

  describe("CLI spawning", () => {
    test("returns { text, prompt } with trimmed stdout as text", async () => {
      spawnBehavior = {
        stdout: "  cleaned text  \n",
        stderr: "",
        exitCode: 0,
      };
      const svc = createCleanupService();
      const result = await svc.cleanup("original", [], [], []);
      expect(result.text).toBe("cleaned text");
      expect(result.prompt).toContain("<transcription>");
    });

    test("model passed as --model arg to claude CLI", async () => {
      spawnBehavior = { stdout: "cleaned", stderr: "", exitCode: 0 };
      const svc = createCleanupService("claude-sonnet-4-5-20250929");
      await svc.cleanup("text", [], [], []);

      expect(spawnCalls).toHaveLength(1);
      expect(spawnCalls[0].command).toBe("claude");
      expect(spawnCalls[0].args).toContain("--model");
      expect(spawnCalls[0].args).toContain("claude-sonnet-4-5-20250929");
    });

    test("no --model arg when model is undefined", async () => {
      spawnBehavior = { stdout: "cleaned", stderr: "", exitCode: 0 };
      const svc = createCleanupService();
      await svc.cleanup("text", [], [], []);

      expect(spawnCalls[0].args).not.toContain("--model");
    });

    test("falls back to original text on spawn error", async () => {
      spawnBehavior = {
        stdout: "",
        stderr: "",
        exitCode: 0,
        error: new Error("spawn failed"),
      };
      const svc = createCleanupService();
      const result = await svc.cleanup("original text", [], [], []);
      expect(result.text).toBe("original text");
    });

    test("falls back to original text on non-zero exit code", async () => {
      spawnBehavior = {
        stdout: "",
        stderr: "some error",
        exitCode: 1,
      };
      const svc = createCleanupService();
      const result = await svc.cleanup("original text", [], [], []);
      expect(result.text).toBe("original text");
    });

    test("falls back to original text on empty stdout", async () => {
      spawnBehavior = { stdout: "", stderr: "", exitCode: 0 };
      const svc = createCleanupService();
      const result = await svc.cleanup("original text", [], [], []);
      expect(result.text).toBe("original text");
    });

    test("accumulates multiple stdout chunks", async () => {
      // Override the spawn mock to emit multiple data chunks
      mock.module("node:child_process", () => ({
        spawn: (
          command: string,
          args: string[],
          _opts: Record<string, unknown>,
        ) => {
          spawnCalls.push({ command, args });
          const child = new EventEmitter();
          const stdout = new EventEmitter();
          const stderr = new EventEmitter();
          (child as unknown as Record<string, unknown>)["stdout"] = stdout;
          (child as unknown as Record<string, unknown>)["stderr"] = stderr;

          queueMicrotask(() => {
            stdout.emit("data", Buffer.from("chunk1 "));
            stdout.emit("data", Buffer.from("chunk2"));
            child.emit("close", 0);
          });

          return child;
        },
      }));

      const { createCleanupService: createSvc } =
        await import("../../services/cleanup.js");
      const svc = createSvc();
      const result = await svc.cleanup("original", [], [], []);
      expect(result.text).toBe("chunk1 chunk2");
    });
  });
});
