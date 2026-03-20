import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, rmSync, existsSync, chmodSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const SCRIPT_PATH = join(import.meta.dir, "package-manager-guard");

function createTempDir(): string {
  const dir = join(
    tmpdir(),
    `pkg-guard-test-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function createMockBin(tempDir: string): string {
  const binDir = join(tempDir, ".mock-bin");
  mkdirSync(binDir, { recursive: true });
  for (const name of ["npm", "bun"]) {
    const mockPath = join(binDir, name);
    writeFileSync(mockPath, "#!/usr/bin/env bash\nexit 0\n");
    chmodSync(mockPath, 0o755);
  }
  return binDir;
}

async function runGuard(
  manager: string,
  cwd: string,
  env: Record<string, string> = {}
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const mockBin = createMockBin(cwd);
  const proc = Bun.spawn(["bash", SCRIPT_PATH, manager, "install"], {
    cwd,
    env: { ...process.env, PATH: `${mockBin}:${process.env.PATH}`, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  return { exitCode, stdout, stderr };
}

describe("package-manager-guard", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe("no lock file (new project)", () => {
    test("npm passes through", async () => {
      const { exitCode } = await runGuard("npm", tempDir);
      expect(exitCode).toBe(0);
    });

    test("bun passes through", async () => {
      const { exitCode } = await runGuard("bun", tempDir);
      expect(exitCode).toBe(0);
    });
  });

  describe("bun project (bun.lock exists)", () => {
    beforeEach(() => {
      writeFileSync(join(tempDir, "bun.lock"), "");
    });

    test("bun passes through", async () => {
      const { exitCode } = await runGuard("bun", tempDir);
      expect(exitCode).toBe(0);
    });

    test("npm is blocked with warning", async () => {
      const { exitCode, stderr } = await runGuard("npm", tempDir);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("bun");
    });
  });

  describe("npm project (package-lock.json exists)", () => {
    beforeEach(() => {
      writeFileSync(join(tempDir, "package-lock.json"), "");
    });

    test("npm passes through", async () => {
      const { exitCode } = await runGuard("npm", tempDir);
      expect(exitCode).toBe(0);
    });

    test("bun is blocked with warning", async () => {
      const { exitCode, stderr } = await runGuard("bun", tempDir);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("npm");
    });
  });

  describe("conflicting lock files (both exist)", () => {
    beforeEach(() => {
      writeFileSync(join(tempDir, "bun.lock"), "");
      writeFileSync(join(tempDir, "package-lock.json"), "");
    });

    test("npm is blocked", async () => {
      const { exitCode, stderr } = await runGuard("npm", tempDir);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("conflicting");
    });

    test("bun is blocked", async () => {
      const { exitCode, stderr } = await runGuard("bun", tempDir);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("conflicting");
    });
  });

  describe("directory traversal", () => {
    test("finds bun.lock in parent directory", async () => {
      writeFileSync(join(tempDir, "bun.lock"), "");
      const subDir = join(tempDir, "packages", "sub");
      mkdirSync(subDir, { recursive: true });

      const { exitCode, stderr } = await runGuard("npm", subDir);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("bun");
    });

    test("finds package-lock.json in parent directory", async () => {
      writeFileSync(join(tempDir, "package-lock.json"), "");
      const subDir = join(tempDir, "src", "deep", "nested");
      mkdirSync(subDir, { recursive: true });

      const { exitCode, stderr } = await runGuard("bun", subDir);
      expect(exitCode).not.toBe(0);
      expect(stderr).toContain("npm");
    });
  });

  describe("PKG_GUARD_SKIP bypass", () => {
    test("npm passes through even in bun project", async () => {
      writeFileSync(join(tempDir, "bun.lock"), "");
      const { exitCode } = await runGuard("npm", tempDir, {
        PKG_GUARD_SKIP: "1",
      });
      expect(exitCode).toBe(0);
    });

    test("bun passes through even in npm project", async () => {
      writeFileSync(join(tempDir, "package-lock.json"), "");
      const { exitCode } = await runGuard("bun", tempDir, {
        PKG_GUARD_SKIP: "1",
      });
      expect(exitCode).toBe(0);
    });
  });

  describe("help and usage", () => {
    test("--help prints usage", async () => {
      const proc = Bun.spawn(["bash", SCRIPT_PATH, "--help"], {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      const stdout = await new Response(proc.stdout).text();
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Usage");
    });

    test("no arguments prints error", async () => {
      const proc = Bun.spawn(["bash", SCRIPT_PATH], {
        cwd: tempDir,
        stdout: "pipe",
        stderr: "pipe",
      });
      const exitCode = await proc.exited;
      expect(exitCode).not.toBe(0);
    });
  });
});
