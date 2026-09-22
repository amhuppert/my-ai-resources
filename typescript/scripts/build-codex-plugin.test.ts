import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  buildCodexPlugin,
  resolveSkillSyncPath,
} from "./build-codex-plugin";

const skillSyncPath = resolveSkillSyncPath();
const skillSyncAvailable = existsSync(skillSyncPath);

describe("resolveSkillSyncPath", () => {
  const originalSkillSync = process.env.SKILL_SYNC;

  afterEach(() => {
    if (originalSkillSync === undefined) {
      delete process.env.SKILL_SYNC;
    } else {
      process.env.SKILL_SYNC = originalSkillSync;
    }
  });

  test("defaults to ~/github/skill-sync/bin/skill-sync.mjs", () => {
    delete process.env.SKILL_SYNC;
    expect(resolveSkillSyncPath()).toBe(
      join(homedir(), "github", "skill-sync", "bin", "skill-sync.mjs"),
    );
  });

  test("respects SKILL_SYNC env var", () => {
    process.env.SKILL_SYNC = "/custom/skill-sync.mjs";
    expect(resolveSkillSyncPath()).toBe("/custom/skill-sync.mjs");
  });
});

describe.skipIf(!skillSyncAvailable)("buildCodexPlugin via skill-sync", () => {
  let tempDir: string;
  let sourcePluginDir: string;
  let codexPluginDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(homedir(), "build-codex-plugin-"));
    sourcePluginDir = join(tempDir, "claude-plugin");
    codexPluginDir = join(tempDir, "codex-plugin");

    mkdirSync(join(sourcePluginDir, ".claude-plugin"), { recursive: true });
    mkdirSync(join(sourcePluginDir, "skills", "commit"), { recursive: true });
    writeFileSync(
      join(sourcePluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({
        name: "ai-resources",
        version: "1.2.3",
        description: "Test plugin",
      }),
    );
    writeFileSync(
      join(sourcePluginDir, "skills", "commit", "SKILL.md"),
      [
        "---",
        "name: commit",
        "description: Commit staged changes.",
        "argument-hint: optional message",
        "allowed-tools: Bash",
        "disable-model-invocation: true",
        "---",
        "Commit the staged changes.",
      ].join("\n"),
    );
    mkdirSync(join(sourcePluginDir, "skills", "commit", "references"), {
      recursive: true,
    });
    writeFileSync(
      join(sourcePluginDir, "skills", "commit", "references", "guide.md"),
      "# Commit guide",
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("builds converted skills and a root plugin.json manifest", () => {
    buildCodexPlugin(sourcePluginDir, codexPluginDir, { skillSyncPath });

    const manifest = JSON.parse(
      readFileSync(join(codexPluginDir, "plugin.json"), "utf-8"),
    ) as {
      $schema?: string;
      name: string;
      version: string;
      description?: string;
    };
    expect(manifest.name).toBe("ai-resources");
    expect(manifest.version).toBe("1.2.3");
    expect(manifest.description).toBe("Test plugin");
    expect(manifest.$schema).toBe(
      "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
    );

    const skillPath = join(codexPluginDir, "skills", "commit");
    const skill = readFileSync(join(skillPath, "SKILL.md"), "utf-8");
    expect(skill).not.toContain("disable-model-invocation");
    expect(skill).not.toContain("allowed-tools");
    expect(skill).not.toContain("argument-hint");
    expect(
      readFileSync(join(skillPath, "agents", "openai.yaml"), "utf-8"),
    ).toContain("allow_implicit_invocation: false");
    expect(existsSync(join(skillPath, "references", "guide.md"))).toBe(true);
  });

  test("rejects a skill without portable frontmatter", () => {
    writeFileSync(
      join(sourcePluginDir, "skills", "commit", "SKILL.md"),
      "---\ntitle: Missing name and description\n---\nBody",
    );

    expect(() =>
      buildCodexPlugin(sourcePluginDir, codexPluginDir, { skillSyncPath }),
    ).toThrow("skill-sync plugin failed");
  });
});
