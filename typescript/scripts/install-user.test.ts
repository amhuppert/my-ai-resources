import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import type {
  CommandExecutor,
  CommandResult,
  InstallConfig,
} from "@/lib/install-types.js";
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
        cursorRulesDir: join(tempDir, "project", ".cursor", "rules"),
        cursorCommandsDir: join(tempDir, "project", ".cursor", "commands"),
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
    await main(mockConfig, mockExecutor);

    const pluginCalls = mockExecutor.calls.filter(
      (call) => call.command === "claude" && call.args[0] === "plugin",
    );

    expect(pluginCalls).toHaveLength(0);
  });
});
