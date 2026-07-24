import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SCRIPT_PATH = join(import.meta.dir, "sync-worktree-dir");

// Selects every option, mimicking confirming a fully pre-selected gum menu.
const GUM_SELECT_ALL_STUB = `#!/usr/bin/env bash
if [[ -n "\${GUM_CAPTURE:-}" ]]; then tee "$GUM_CAPTURE"; else cat; fi
`;

function writeExecutable(path: string, contents: string): void {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function git(args: string[], cwd: string): void {
  const proc = Bun.spawnSync(["git", ...args], {
    cwd,
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
    },
  });
  if (proc.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${proc.stderr.toString()}`);
  }
}

describe("sync-worktree-dir", () => {
  let tempDir: string;
  let mainDir: string;
  let wt1Dir: string;
  let wt2Dir: string;
  let binDir: string;
  let gumCapturePath: string;

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `sync-worktree-dir-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    mainDir = join(tempDir, "main repo");
    wt1Dir = join(tempDir, "wt1");
    wt2Dir = join(tempDir, "wt2");
    binDir = join(tempDir, "bin");
    gumCapturePath = join(tempDir, "gum-options.txt");

    mkdirSync(binDir, { recursive: true });
    writeExecutable(join(binDir, "gum"), GUM_SELECT_ALL_STUB);

    mkdirSync(join(mainDir, "shared", "sub"), { recursive: true });
    mkdirSync(join(mainDir, "nested", "inner"), { recursive: true });
    writeFileSync(join(mainDir, "shared", "file.txt"), "v1");
    writeFileSync(join(mainDir, "shared", "sub", "deep.txt"), "deep-v1");
    writeFileSync(join(mainDir, "nested", "inner", "data.txt"), "n1");

    git(["init", "-b", "main"], mainDir);
    git(["config", "user.email", "test@example.com"], mainDir);
    git(["config", "user.name", "Test"], mainDir);
    git(["add", "."], mainDir);
    git(["commit", "-m", "initial"], mainDir);
    git(["worktree", "add", wt1Dir, "-b", "wt1"], mainDir);
    git(["worktree", "add", wt2Dir, "-b", "wt2"], mainDir);
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  async function run(
    args: string[],
    cwd: string,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const proc = Bun.spawn(["bash", SCRIPT_PATH, ...args], {
      cwd,
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH}`,
        GUM_CAPTURE: gumCapturePath,
      },
      stdout: "pipe",
      stderr: "pipe",
    });

    const [exitCode, stdout, stderr] = await Promise.all([
      proc.exited,
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    return { exitCode, stdout, stderr };
  }

  test("replaces the directory in every other worktree with the root version", async () => {
    writeFileSync(join(mainDir, "shared", "file.txt"), "v2");
    writeFileSync(join(mainDir, "shared", "new.txt"), "new");
    writeFileSync(join(wt1Dir, "shared", "extra.txt"), "junk");

    const result = await run(["shared"], mainDir);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(wt1Dir, "shared", "file.txt"), "utf8")).toBe("v2");
    expect(readFileSync(join(wt2Dir, "shared", "file.txt"), "utf8")).toBe("v2");
    expect(readFileSync(join(wt1Dir, "shared", "new.txt"), "utf8")).toBe("new");
    expect(readFileSync(join(wt1Dir, "shared", "sub", "deep.txt"), "utf8")).toBe(
      "deep-v1",
    );
    expect(existsSync(join(wt1Dir, "shared", "extra.txt"))).toBe(false);
    expect(result.stdout).toContain("wt1");
    expect(result.stdout).toContain("wt2");
    expect(result.stderr).toBe("");
  });

  test("syncs from the root even when run inside a non-root worktree", async () => {
    writeFileSync(join(wt1Dir, "shared", "file.txt"), "local-change");

    const result = await run(["shared"], wt1Dir);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(wt1Dir, "shared", "file.txt"), "utf8")).toBe("v1");
    expect(readFileSync(join(wt2Dir, "shared", "file.txt"), "utf8")).toBe("v1");
  });

  test("--from-current pushes the current worktree version to root and all others", async () => {
    writeFileSync(join(wt1Dir, "shared", "file.txt"), "wt1-v");
    writeFileSync(join(wt1Dir, "shared", "only-wt1.txt"), "x");
    writeFileSync(join(mainDir, "shared", "root-only.txt"), "r");

    const result = await run(["--from-current", "shared"], wt1Dir);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(mainDir, "shared", "file.txt"), "utf8")).toBe(
      "wt1-v",
    );
    expect(readFileSync(join(mainDir, "shared", "only-wt1.txt"), "utf8")).toBe(
      "x",
    );
    expect(existsSync(join(mainDir, "shared", "root-only.txt"))).toBe(false);
    expect(readFileSync(join(wt2Dir, "shared", "file.txt"), "utf8")).toBe(
      "wt1-v",
    );
    expect(readFileSync(join(wt2Dir, "shared", "only-wt1.txt"), "utf8")).toBe(
      "x",
    );
    expect(result.stdout).toContain("root");
  });

  test("lists dirty worktrees in the menu and only overwrites the selected ones", async () => {
    writeFileSync(join(mainDir, "shared", "file.txt"), "v2");
    writeFileSync(join(wt1Dir, "shared", "file.txt"), "wt1-local");
    writeFileSync(join(wt2Dir, "shared", "file.txt"), "wt2-local");
    writeExecutable(
      join(binDir, "gum"),
      '#!/usr/bin/env bash\ntee "$GUM_CAPTURE" | grep wt1 || true\n',
    );

    const result = await run(["shared"], mainDir);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(wt1Dir, "shared", "file.txt"), "utf8")).toBe("v2");
    expect(readFileSync(join(wt2Dir, "shared", "file.txt"), "utf8")).toBe(
      "wt2-local",
    );
    const menuOptions = readFileSync(gumCapturePath, "utf8");
    expect(menuOptions).toContain("wt1");
    expect(menuOptions).toContain("wt2");
    expect(result.stdout).toContain("skipped");
  });

  test("does not prompt when all destination worktrees are clean", async () => {
    writeFileSync(join(mainDir, "shared", "file.txt"), "v3");
    writeExecutable(
      join(binDir, "gum"),
      '#!/usr/bin/env bash\necho poisoned > "$GUM_CAPTURE"\nexit 1\n',
    );

    const result = await run(["shared"], mainDir);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(wt1Dir, "shared", "file.txt"), "utf8")).toBe("v3");
    expect(readFileSync(join(wt2Dir, "shared", "file.txt"), "utf8")).toBe("v3");
    expect(existsSync(gumCapturePath)).toBe(false);
  });

  test("--from-current still updates other worktrees when the dirty root is deselected", async () => {
    writeFileSync(join(wt1Dir, "shared", "file.txt"), "wt1-v");
    writeFileSync(join(mainDir, "shared", "file.txt"), "root-dirty");
    writeExecutable(
      join(binDir, "gum"),
      '#!/usr/bin/env bash\ntee "$GUM_CAPTURE" >/dev/null\n',
    );

    const result = await run(["--from-current", "shared"], wt1Dir);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(mainDir, "shared", "file.txt"), "utf8")).toBe(
      "root-dirty",
    );
    expect(readFileSync(join(wt2Dir, "shared", "file.txt"), "utf8")).toBe(
      "wt1-v",
    );
    expect(result.stdout).toContain("skipped");
  });

  test("--from-current fails when run from the root worktree", async () => {
    const result = await run(["--from-current", "shared"], mainDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("root worktree");
  });

  test("recreates missing parent directories in the destination", async () => {
    rmSync(join(wt2Dir, "nested"), { recursive: true });

    const result = await run(["nested/inner"], mainDir);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(join(wt2Dir, "nested", "inner", "data.txt"), "utf8")).toBe(
      "n1",
    );
  });

  test("accepts a trailing slash and ./ prefix", async () => {
    const result = await run(["./shared/"], mainDir);

    expect(result.exitCode).toBe(0);
  });

  test("rejects invalid directory arguments", async () => {
    expect((await run([], mainDir)).exitCode).not.toBe(0);

    const absolute = await run(["/etc"], mainDir);
    expect(absolute.exitCode).not.toBe(0);
    expect(absolute.stderr).toContain("relative");

    expect((await run(["../outside"], mainDir)).exitCode).not.toBe(0);
    expect((await run([".git"], mainDir)).exitCode).not.toBe(0);
    expect((await run(["--bogus", "shared"], mainDir)).exitCode).not.toBe(0);

    const missing = await run(["does-not-exist"], mainDir);
    expect(missing.exitCode).not.toBe(0);
    expect(missing.stderr).toContain("not a directory");

    const file = await run(["shared/file.txt"], mainDir);
    expect(file.exitCode).not.toBe(0);
    expect(file.stderr).toContain("not a directory");
  });

  test("--help prints usage and works outside a git repository", async () => {
    const result = await run(["--help"], tempDir);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Usage");
    expect(result.stdout).toContain("--from-current");
  });

  test("fails when run outside a git repository", async () => {
    const result = await run(["shared"], tempDir);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("git repository");
  });
});
