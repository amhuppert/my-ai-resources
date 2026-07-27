import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SCRIPT_PATH = join(import.meta.dir, "install-skills");

function writeExecutable(path: string, contents: string): void {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function git(repo: string, ...args: string[]): void {
  const result = Bun.spawnSync(["git", "-C", repo, ...args], {
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${new TextDecoder().decode(result.stderr)}`,
    );
  }
}

function initGitRepo(path: string): string {
  mkdirSync(path, { recursive: true });
  git(path, "init", "-q");
  git(path, "config", "user.email", "install-skills-test@example.invalid");
  git(path, "config", "user.name", "install-skills-test");
  writeFileSync(join(path, "README"), "fixture\n");
  git(path, "add", "README");
  git(path, "commit", "-qm", "baseline");
  return join(path, ".git", "info", "exclude");
}

function excludeLines(excludeFile: string): string[] {
  if (!existsSync(excludeFile)) return [];
  return readFileSync(excludeFile, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"));
}

describe("install-skills", () => {
  let tempDir: string;
  let repoDir: string;
  let binDir: string;
  let capturePath: string;

  beforeEach(() => {
    tempDir = join(
      tmpdir(),
      `install-skills-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    );
    repoDir = join(tempDir, "local skills repo");
    binDir = join(tempDir, "bin");
    capturePath = join(tempDir, "skills-args.txt");

    mkdirSync(join(repoDir, "skills", "alpha"), { recursive: true });
    mkdirSync(join(repoDir, "skills", "beta"), { recursive: true });
    mkdirSync(join(repoDir, "presets"), { recursive: true });
    mkdirSync(binDir, { recursive: true });
    writeFileSync(join(repoDir, "skills", "alpha", "SKILL.md"), "# Alpha\n");
    writeFileSync(join(repoDir, "skills", "beta", "SKILL.md"), "# Beta\n");

    writeExecutable(
      join(binDir, "skills"),
      '#!/usr/bin/env bash\nprintf "%s\\n" "$@" > "$CAPTURE_PATH"\npwd > "$CAPTURE_PATH.cwd"\n',
    );
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  async function run(
    args: string[] = [],
    env: Record<string, string | undefined> = {},
    cwd: string = tempDir,
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    const processEnv = {
      ...process.env,
      LOCAL_SKILLS_REPO: repoDir,
      CAPTURE_PATH: capturePath,
      PATH: `${binDir}:${process.env.PATH}`,
    };
    for (const [key, value] of Object.entries(env)) {
      if (value === undefined) delete processEnv[key];
      else processEnv[key] = value;
    }

    const proc = Bun.spawn(["bash", SCRIPT_PATH, ...args], {
      cwd,
      env: processEnv,
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

  test("installs every skill from a preset globally for Claude and Codex", async () => {
    writeFileSync(join(repoDir, "presets", "team.txt"), "alpha\nbeta\n");

    const result = await run(["--preset", "team.txt", "--scope", "global"]);

    expect(result.exitCode).toBe(0);
    expect(readFileSync(capturePath, "utf8").trim().split("\n")).toEqual([
      "add",
      join(repoDir, "skills"),
      "--skill",
      "alpha",
      "--skill",
      "beta",
      "--agent",
      "claude-code",
      "--agent",
      "codex",
      "--copy",
      "--yes",
      "--global",
    ]);
  });

  test("uses gum to choose skills and project scope when no preset is given", async () => {
    writeExecutable(
      join(binDir, "gum"),
      `#!/usr/bin/env bash
if [[ " $* " == *" --no-limit "* ]]; then
  printf "beta\\n"
else
  printf "project\\n"
fi
`,
    );

    const result = await run();

    expect(result.exitCode).toBe(0);
    expect(readFileSync(capturePath, "utf8").trim().split("\n")).toEqual([
      "add",
      join(repoDir, "skills"),
      "--skill",
      "beta",
      "--agent",
      "claude-code",
      "--agent",
      "codex",
      "--copy",
      "--yes",
    ]);
  });

  test("rejects a preset containing a skill that is not in the repo", async () => {
    writeFileSync(join(repoDir, "presets", "invalid.txt"), "missing\n");

    const result = await run(["--preset", "invalid.txt", "--scope", "project"]);

    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("missing");
    expect(existsSync(capturePath)).toBe(false);
  });

  test("shows help without a source and rejects a missing repository", async () => {
    const result = await run(["--help"], { LOCAL_SKILLS_REPO: undefined });

    expect(result.exitCode).toBe(0);

    const missingRepo = await run(
      ["--repo", join(tempDir, "missing"), "--scope", "global"],
      { LOCAL_SKILLS_REPO: undefined },
    );
    expect(missingRepo.exitCode).not.toBe(0);
    expect(missingRepo.stderr).toContain("skills directory not found");
  });

  test("accepts an explicit repository source", async () => {
    writeFileSync(join(repoDir, "presets", "team.txt"), "alpha\n");

    const result = await run(
      ["--repo", repoDir, "--preset", "team.txt", "--scope", "global"],
      { LOCAL_SKILLS_REPO: undefined },
    );

    expect(result.exitCode).toBe(0);
    expect(readFileSync(capturePath, "utf8")).toContain(
      join(repoDir, "skills"),
    );
  });

  describe("--local", () => {
    let consumerDir: string;
    let excludeFile: string;

    beforeEach(() => {
      consumerDir = join(tempDir, "consumer");
      excludeFile = initGitRepo(consumerDir);
      writeFileSync(join(repoDir, "presets", "team.txt"), "alpha\nbeta\n");
    });

    test("excludes both agent skill directories and the lock file", async () => {
      const result = await run(
        ["--preset", "team.txt", "--scope", "project", "--local"],
        {},
        consumerDir,
      );

      expect(result.exitCode).toBe(0);
      expect(excludeLines(excludeFile)).toEqual([
        "skills-lock.json",
        ".claude/skills/alpha/",
        ".agents/skills/alpha/",
        ".claude/skills/beta/",
        ".agents/skills/beta/",
      ]);
    });

    test("installs at the repository root when run from a subdirectory", async () => {
      const subDir = join(consumerDir, "packages", "app");
      mkdirSync(subDir, { recursive: true });

      const result = await run(
        ["--preset", "team.txt", "--scope", "project", "--local"],
        {},
        subDir,
      );

      expect(result.exitCode).toBe(0);
      // Exclude patterns containing a slash are anchored to the repository
      // root, so an install into packages/app would never match them.
      expect(readFileSync(`${capturePath}.cwd`, "utf8").trim()).toBe(
        realpathSync(consumerDir),
      );
    });

    test("keeps git-tracked skill directories out of the exclude file", async () => {
      const trackedSkill = join(consumerDir, ".claude", "skills", "alpha");
      mkdirSync(trackedSkill, { recursive: true });
      writeFileSync(join(trackedSkill, "SKILL.md"), "# Tracked alpha\n");
      git(consumerDir, "add", ".claude/skills/alpha/SKILL.md");
      git(consumerDir, "commit", "-qm", "track alpha");

      const result = await run(
        ["--preset", "team.txt", "--scope", "project", "--local"],
        {},
        consumerDir,
      );

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toContain(".claude/skills/alpha/");
      expect(result.stderr).toContain("git-tracked");

      const lines = excludeLines(excludeFile);
      expect(lines).not.toContain(".claude/skills/alpha/");
      expect(lines).toContain(".agents/skills/alpha/");
    });

    test("does not duplicate entries when run twice", async () => {
      const first = await run(
        ["--preset", "team.txt", "--scope", "project", "--local"],
        {},
        consumerDir,
      );
      const firstLines = excludeLines(excludeFile);

      const second = await run(
        ["--preset", "team.txt", "--scope", "project", "--local"],
        {},
        consumerDir,
      );

      expect(first.exitCode).toBe(0);
      expect(second.exitCode).toBe(0);
      expect(second.stdout).toContain("All exclude entries already present");
      expect(excludeLines(excludeFile)).toEqual(firstLines);
    });

    test("rejects global scope without installing", async () => {
      const result = await run(
        ["--preset", "team.txt", "--scope", "global", "--local"],
        {},
        consumerDir,
      );

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("project scope");
      expect(existsSync(capturePath)).toBe(false);
      expect(excludeLines(excludeFile)).toEqual([]);
    });

    test("resolves a relative --repo before changing directory", async () => {
      const result = await run(
        [
          "--repo",
          "../local skills repo",
          "--preset",
          "team.txt",
          "--scope",
          "project",
          "--local",
        ],
        { LOCAL_SKILLS_REPO: undefined },
        consumerDir,
      );

      expect(result.exitCode).toBe(0);
      expect(readFileSync(capturePath, "utf8").trim().split("\n")[1]).toBe(
        realpathSync(join(repoDir, "skills")),
      );
    });

    test("fails before installing when outside a git repository", async () => {
      const result = await run(
        ["--preset", "team.txt", "--scope", "project", "--local"],
        {},
        tempDir,
      );

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain("git repository");
      expect(existsSync(capturePath)).toBe(false);
    });
  });
});
