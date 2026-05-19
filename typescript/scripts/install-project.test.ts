import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type {
  CommandExecutor,
  CommandResult,
  InstallConfig,
} from "@/lib/install-types.js";
import { type InstallItem } from "@/lib/install-items.js";
import { main } from "./install-project";

class MockCommandExecutor implements CommandExecutor {
  calls: Array<{ command: string; args: string[]; options?: any }> = [];

  async exec(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ): Promise<CommandResult> {
    this.calls.push({ command, args, options });
    return { success: true, stdout: "", stderr: "", exitCode: 0 };
  }

  async exists(_command: string): Promise<boolean> {
    return true;
  }
}

describe("install-project", () => {
  let tempDir: string;
  let prevCwd: string;
  let mockExecutor: MockCommandExecutor;
  let mockConfig: InstallConfig;

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `install-project-test-${Date.now()}-${Math.random()}`,
    );
    mkdirSync(tempDir, { recursive: true });
    prevCwd = process.cwd();
    process.chdir(tempDir);

    mockExecutor = new MockCommandExecutor();
    mockConfig = {
      paths: {
        userHome: tempDir,
        userClaudeDir: join(tempDir, ".claude"),
        userLocalBin: join(tempDir, ".local", "bin"),
        projectClaudeDir: join(tempDir, ".claude"),
      },
      commands: {
        rsyncFlags: ["-a"],
        chmodExecutable: 0o755,
      },
    };
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("installs CLAUDE.md when claude-md is selected", async () => {
    const selected = new Set<InstallItem>(["claude-md"]);
    await main(mockConfig, mockExecutor, selected);

    expect(existsSync(join(tempDir, "CLAUDE.md"))).toBe(true);
  });

  test("skips CLAUDE.md when not selected", async () => {
    const selected = new Set<InstallItem>();
    await main(mockConfig, mockExecutor, selected);

    expect(existsSync(join(tempDir, "CLAUDE.md"))).toBe(false);
  });
});
