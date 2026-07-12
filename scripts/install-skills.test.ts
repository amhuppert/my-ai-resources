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

const SCRIPT_PATH = join(import.meta.dir, "install-skills");

function writeExecutable(path: string, contents: string): void {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
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
      '#!/usr/bin/env bash\nprintf "%s\\n" "$@" > "$CAPTURE_PATH"\n',
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
      cwd: tempDir,
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

  test("requires LOCAL_SKILLS_REPO", async () => {
    const result = await run(["--help"], { LOCAL_SKILLS_REPO: undefined });

    expect(result.exitCode).toBe(0);

    const missingEnv = await run([], { LOCAL_SKILLS_REPO: undefined });
    expect(missingEnv.exitCode).not.toBe(0);
    expect(missingEnv.stderr).toContain("LOCAL_SKILLS_REPO");
  });
});
