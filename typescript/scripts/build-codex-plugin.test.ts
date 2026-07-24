import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildCodexPlugin,
  convertSkillFrontmatter,
  createOpenAiYaml,
} from "./build-codex-plugin";

describe("buildCodexPlugin", () => {
  let tempDir: string;
  let sourcePluginDir: string;
  let codexPluginDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "build-codex-plugin-"));
    sourcePluginDir = join(tempDir, "claude-plugin");
    codexPluginDir = join(tempDir, "codex-plugin");

    mkdirSync(join(sourcePluginDir, ".claude-plugin"), { recursive: true });
    mkdirSync(join(sourcePluginDir, "skills", "commit"), { recursive: true });
    mkdirSync(join(codexPluginDir, ".codex-plugin"), { recursive: true });
    writeFileSync(
      join(sourcePluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "ai-resources", version: "1.2.3" }),
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
    writeFileSync(
      join(codexPluginDir, ".codex-plugin", "plugin.json"),
      JSON.stringify({ name: "ai-resources", version: "0.1.0" }),
    );
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("builds normalized skills and synchronizes the plugin version", () => {
    buildCodexPlugin(sourcePluginDir, codexPluginDir);

    const manifest = JSON.parse(
      readFileSync(
        join(codexPluginDir, ".codex-plugin", "plugin.json"),
        "utf-8",
      ),
    ) as { version: string };
    expect(manifest.version).toBe("1.2.3");

    const skillPath = join(codexPluginDir, "skills", "commit");
    const skill = readFileSync(join(skillPath, "SKILL.md"), "utf-8");
    expect(skill).not.toContain("disable-model-invocation");
    expect(skill).not.toContain("allowed-tools");
    expect(skill).not.toContain("argument-hint");
    expect(
      readFileSync(join(skillPath, "agents", "openai.yaml"), "utf-8"),
    ).toContain("allow_implicit_invocation: false");
    expect(existsSync(join(skillPath, "SKILL.md"))).toBe(true);
    expect(existsSync(join(skillPath, "references", "guide.md"))).toBe(true);
  });

  test("rejects a skill without portable frontmatter", () => {
    writeFileSync(
      join(sourcePluginDir, "skills", "commit", "SKILL.md"),
      "---\ntitle: Missing name and description\n---\nBody",
    );

    expect(() => buildCodexPlugin(sourcePluginDir, codexPluginDir)).toThrow(
      "string name and description",
    );
  });
});

describe("Codex skill conversion", () => {
  test("supports reserved YAML characters and truncates long descriptions", () => {
    const converted = convertSkillFrontmatter(
      [
        "---",
        "name: expo-ui",
        `description: \`@expo/ui\` ${"x".repeat(1100)}`,
        "allowed-tools: Bash",
        "---",
        "Body",
      ].join("\n"),
    );

    expect(converted).toContain("`@expo/ui`");
    expect(converted).not.toContain("allowed-tools");
    expect(converted).toContain("Body");
    expect(converted).not.toContain("x".repeat(1025));
  });

  test("creates Codex UI metadata and explicit-only policy", () => {
    const output = createOpenAiYaml(
      "react-scan",
      "This skill should be used when diagnosing React rendering issues.",
      true,
    );

    expect(output).toContain('display_name: "React Scan"');
    expect(output).toContain(
      'default_prompt: "Use $react-scan to apply the React Scan workflow to this request."',
    );
    expect(output).toContain("allow_implicit_invocation: false");
  });
});
