import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type {
  CommandExecutor,
  CommandResult,
  InstallConfig,
} from "@/lib/install-types.js";
import {
  ITEMS_BY_SCOPE,
  type InstallItem,
} from "@/lib/install-items.js";
import { main } from "./install-user";

class MockCommandExecutor implements CommandExecutor {
  calls: Array<{ command: string; args: string[]; options?: any }> = [];

  async exec(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ): Promise<CommandResult> {
    this.calls.push({ command, args, options });

    // When rsync copies a file, create the destination so chmod succeeds
    if (command === "rsync" && args.length >= 3) {
      const dest = args[args.length - 1]!;
      if (!dest.endsWith("/")) {
        const destDir = join(dest, "..");
        mkdirSync(destDir, { recursive: true });
        writeFileSync(dest, "");
      }
    }

    return { success: true, stdout: "", stderr: "", exitCode: 0 };
  }

  async exists(_command: string): Promise<boolean> {
    return true;
  }
}

describe("install-user", () => {
  let tempDir: string;
  let mockExecutor: MockCommandExecutor;
  let mockConfig: InstallConfig;
  const allUserItems = new Set<InstallItem>(ITEMS_BY_SCOPE.user);

  beforeEach(() => {
    tempDir = join(tmpdir(), `install-user-test-${Date.now()}-${Math.random()}`);
    mkdirSync(tempDir, { recursive: true });

    mockExecutor = new MockCommandExecutor();

    mockConfig = {
      paths: {
        userHome: tempDir,
        userClaudeDir: join(tempDir, ".claude"),
        userLocalBin: join(tempDir, ".local", "bin"),
        projectClaudeDir: join(tempDir, "project", ".claude"),
      },
      commands: {
        rsyncFlags: ["-a"],
        chmodExecutable: 0o755,
      },
    };
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("does not install ai-resources plugin", async () => {
    await main(mockConfig, mockExecutor, allUserItems);

    const pluginCalls = mockExecutor.calls.filter(
      (call) => call.command === "claude" && call.args[0] === "plugin",
    );

    expect(pluginCalls).toHaveLength(0);
  });

  test("skips utility-scripts when not selected", async () => {
    const selected = new Set<InstallItem>(["agent-docs"]);
    await main(mockConfig, mockExecutor, selected);

    const builtListServers = mockExecutor.calls.some(
      (call) =>
        call.command === "bun" &&
        call.args.includes("run") &&
        call.args.includes("build:list-servers"),
    );
    expect(builtListServers).toBe(false);

    const copiedToLocalBin = mockExecutor.calls.some(
      (call) =>
        call.command === "rsync" &&
        call.args.some((arg) => arg.includes(mockConfig.paths.userLocalBin)),
    );
    expect(copiedToLocalBin).toBe(false);
  });

  test("skips agent-docs when not selected", async () => {
    const selected = new Set<InstallItem>(["utility-scripts"]);
    await main(mockConfig, mockExecutor, selected);

    const syncedAgentDocs = mockExecutor.calls.some(
      (call) =>
        call.command === "rsync" &&
        call.args.some((arg) => arg.includes("agent-docs")),
    );
    expect(syncedAgentDocs).toBe(false);
  });

  test("skips worktree-schema when not selected", async () => {
    const selected = new Set<InstallItem>(["agent-docs"]);
    await main(mockConfig, mockExecutor, selected);

    const schemaPath = join(
      mockConfig.paths.userClaudeDir,
      "schemas",
      "worktree-files-schema.json",
    );
    expect(existsSync(schemaPath)).toBe(false);
  });

  test("installs worktree-schema when selected", async () => {
    const selected = new Set<InstallItem>(["worktree-schema"]);
    await main(mockConfig, mockExecutor, selected);

    const schemaPath = join(
      mockConfig.paths.userClaudeDir,
      "schemas",
      "worktree-files-schema.json",
    );
    expect(existsSync(schemaPath)).toBe(true);
  });

  test("does nothing when no items are selected", async () => {
    const selected = new Set<InstallItem>();
    await main(mockConfig, mockExecutor, selected);

    expect(mockExecutor.calls).toHaveLength(0);
  });
});
