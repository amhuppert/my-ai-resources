import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  replaceMarkedSection,
  execCommand,
  commandExists,
  syncDirectory,
  copyFile,
  installFile,
  installDirectory,
} from "./installer-utils";
import type {
  CommandExecutor,
  CommandResult,
  InstallConfig,
} from "./install-types";

// Mock CommandExecutor for testing
class MockCommandExecutor implements CommandExecutor {
  calls: Array<{ command: string; args: string[]; options?: any }> = [];
  results: Map<string, CommandResult> = new Map();

  async exec(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string> },
  ): Promise<CommandResult> {
    this.calls.push({ command, args, options });
    const key = `${command} ${args.join(" ")}`;
    return (
      this.results.get(key) || {
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
      }
    );
  }

  async exists(command: string): Promise<boolean> {
    const key = `which ${command}`;
    const result = this.results.get(key);
    return result?.success ?? true;
  }

  setResult(command: string, args: string[], result: CommandResult) {
    const key = `${command} ${args.join(" ")}`;
    this.results.set(key, result);
  }

  reset() {
    this.calls = [];
    this.results.clear();
  }
}

describe("replaceMarkedSection", () => {
  const BEGIN_MARKER = "<!-- Begin standard instructions -->";
  const END_MARKER = "<!-- End of standard instructions -->";

  test("replaces existing marked section", () => {
    const dest = `Some content
${BEGIN_MARKER}
Old content here
${END_MARKER}
More content`;

    const source = `${BEGIN_MARKER}
New content here
${END_MARKER}
`;

    const result = replaceMarkedSection(dest, source);

    expect(result).toContain("New content here");
    expect(result).not.toContain("Old content here");
    expect(result).toContain("Some content");
    expect(result).toContain("More content");
  });

  test("appends content when markers do not exist", () => {
    const dest = "Existing content";
    const source = `${BEGIN_MARKER}
New content
${END_MARKER}
`;

    const result = replaceMarkedSection(dest, source);

    expect(result).toBe("Existing content" + source);
  });

  test("preserves content outside markers", () => {
    const dest = `Before
${BEGIN_MARKER}
Old
${END_MARKER}
After`;

    const source = `${BEGIN_MARKER}
New
${END_MARKER}`;

    const result = replaceMarkedSection(dest, source);

    expect(result).toContain("Before");
    expect(result).toContain("After");
    expect(result).toContain("New");
  });
});

describe("execCommand with mock executor", () => {
  let mockExecutor: MockCommandExecutor;

  beforeEach(() => {
    mockExecutor = new MockCommandExecutor();
  });

  test("executes command and returns result", async () => {
    mockExecutor.setResult("echo", ["hello"], {
      success: true,
      stdout: "hello",
      stderr: "",
      exitCode: 0,
    });

    const result = await execCommand("echo", ["hello"], mockExecutor);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("hello");
    expect(mockExecutor.calls).toHaveLength(1);
    expect(mockExecutor.calls[0]?.command).toBe("echo");
  });

  test("handles command failure", async () => {
    mockExecutor.setResult("false", [], {
      success: false,
      stdout: "",
      stderr: "command failed",
      exitCode: 1,
    });

    const result = await execCommand("false", [], mockExecutor);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("command failed");
  });

  test("passes options to executor", async () => {
    await execCommand("ls", ["-la"], mockExecutor, {
      cwd: "/tmp",
      env: { FOO: "bar" },
    });

    expect(mockExecutor.calls[0]?.options?.cwd).toBe("/tmp");
    expect(mockExecutor.calls[0]?.options?.env?.FOO).toBe("bar");
  });
});

describe("commandExists with mock executor", () => {
  let mockExecutor: MockCommandExecutor;

  beforeEach(() => {
    mockExecutor = new MockCommandExecutor();
  });

  test("returns true when command exists", async () => {
    mockExecutor.setResult("which", ["bun"], {
      success: true,
      stdout: "/usr/bin/bun",
      stderr: "",
      exitCode: 0,
    });

    const exists = await commandExists("bun", mockExecutor);
    expect(exists).toBe(true);
  });

  test("returns false when command does not exist", async () => {
    mockExecutor.setResult("which", ["nonexistent"], {
      success: false,
      stdout: "",
      stderr: "not found",
      exitCode: 1,
    });

    const exists = await commandExists("nonexistent", mockExecutor);
    expect(exists).toBe(false);
  });
});

describe("File operations with temp directories", () => {
  let tempDir: string;
  let mockExecutor: MockCommandExecutor;
  let mockConfig: InstallConfig;

  beforeEach(() => {
    // Create unique temp directory for each test
    tempDir = join(tmpdir(), `installer-test-${Date.now()}-${Math.random()}`);
    mkdirSync(tempDir, { recursive: true });

    mockExecutor = new MockCommandExecutor();

    // Mock rsync to always succeed
    mockExecutor.setResult("rsync", ["-a"], {
      success: true,
      stdout: "",
      stderr: "",
      exitCode: 0,
    });

    mockConfig = {
      paths: {
        userHome: tempDir,
        userClaudeDir: join(tempDir, ".claude"),
        userLocalBin: join(tempDir, ".local", "bin"),
        userRinsHooks: join(tempDir, "rins_hooks"),
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
    // Cleanup temp directory
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("syncDirectory calls rsync with correct arguments", async () => {
    const srcDir = join(tempDir, "source");
    const destDir = join(tempDir, "dest");
    mkdirSync(srcDir, { recursive: true });

    await syncDirectory(srcDir, destDir, mockConfig, mockExecutor);

    expect(mockExecutor.calls).toHaveLength(1);
    expect(mockExecutor.calls[0]?.command).toBe("rsync");
    expect(mockExecutor.calls[0]?.args).toContain("-a");
    expect(mockExecutor.calls[0]?.args).toContain(`${srcDir}/`);
    expect(mockExecutor.calls[0]?.args).toContain(`${destDir}/`);
  });

  test("syncDirectory throws error when source does not exist", async () => {
    const srcDir = join(tempDir, "nonexistent");
    const destDir = join(tempDir, "dest");

    await expect(
      syncDirectory(srcDir, destDir, mockConfig, mockExecutor),
    ).rejects.toThrow("Source directory not found");
  });

  test("copyFile calls rsync with correct arguments", async () => {
    const srcFile = join(tempDir, "source.txt");
    const destFile = join(tempDir, "dest", "file.txt");
    writeFileSync(srcFile, "test content");

    await copyFile(srcFile, destFile, mockConfig, mockExecutor);

    expect(mockExecutor.calls).toHaveLength(1);
    expect(mockExecutor.calls[0]?.command).toBe("rsync");
    expect(mockExecutor.calls[0]?.args).toContain(srcFile);
    expect(mockExecutor.calls[0]?.args).toContain(destFile);
  });

  test("copyFile throws error when source file does not exist", async () => {
    const srcFile = join(tempDir, "nonexistent.txt");
    const destFile = join(tempDir, "dest.txt");

    await expect(
      copyFile(srcFile, destFile, mockConfig, mockExecutor),
    ).rejects.toThrow("Source file not found");
  });

  test("installFile copies file and sets executable permissions", async () => {
    const srcFile = join(tempDir, "script.sh");
    const destFile = join(tempDir, "bin", "script.sh");
    writeFileSync(srcFile, "#!/bin/bash\necho test");

    // Mock successful rsync - but actually create the dest file so chmod works
    mockExecutor.reset();
    for (const args of [["-a"]]) {
      mockExecutor.setResult("rsync", args, {
        success: true,
        stdout: "",
        stderr: "",
        exitCode: 0,
      });
    }

    // Pre-create destination file so chmod succeeds
    mkdirSync(join(tempDir, "bin"), { recursive: true });
    writeFileSync(destFile, "#!/bin/bash\necho test");

    await installFile(
      srcFile,
      destFile,
      "Installing script",
      mockConfig,
      mockExecutor,
      true,
    );

    expect(mockExecutor.calls).toHaveLength(1);
    expect(mockExecutor.calls[0]?.command).toBe("rsync");
  });

  test("installDirectory syncs directory when source exists", async () => {
    const srcDir = join(tempDir, "source");
    const destDir = join(tempDir, "dest");
    mkdirSync(srcDir, { recursive: true });
    writeFileSync(join(srcDir, "file.txt"), "content");

    await installDirectory(
      srcDir,
      destDir,
      "Installing directory",
      mockConfig,
      mockExecutor,
    );

    expect(mockExecutor.calls).toHaveLength(1);
    expect(mockExecutor.calls[0]?.command).toBe("rsync");
  });

  test("installDirectory warns when source does not exist", async () => {
    const srcDir = join(tempDir, "nonexistent");
    const destDir = join(tempDir, "dest");

    // Should not throw, just log warning
    await installDirectory(
      srcDir,
      destDir,
      "Installing directory",
      mockConfig,
      mockExecutor,
    );

    // Should not call rsync
    expect(mockExecutor.calls).toHaveLength(0);
  });
});
