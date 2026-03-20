import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { convertSkillFrontmatter, syncSkills } from "./skill-sync.ts";
import type { DiscoveredSkill } from "./types.ts";

function createSkillDir(
  baseDir: string,
  skillName: string,
  frontmatter: Record<string, unknown>,
  body: string,
  extras?: Record<string, string>,
): DiscoveredSkill {
  const skillDir = join(baseDir, skillName);
  mkdirSync(skillDir, { recursive: true });

  const fmLines = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return `${k}:\n${v.map((item) => `  - ${item}`).join("\n")}`;
      }
      return `${k}: ${v}`;
    })
    .join("\n");
  const content = `---\n${fmLines}\n---\n${body}`;
  const skillMdPath = join(skillDir, "SKILL.md");
  writeFileSync(skillMdPath, content);

  if (extras) {
    for (const [relPath, fileContent] of Object.entries(extras)) {
      const fullPath = join(skillDir, relPath);
      mkdirSync(join(fullPath, ".."), { recursive: true });
      writeFileSync(fullPath, fileContent);
    }
  }

  return { name: skillName, sourceDir: skillDir, skillMdPath };
}

describe("convertSkillFrontmatter", () => {
  test("strips allowed-tools and argument-hint, preserves name, description, and body", () => {
    const input = [
      "---",
      "name: commit",
      "description: AI-aware git commit",
      "allowed-tools: Bash, Read",
      "argument-hint: optional commit message",
      "---",
      "Body content here",
    ].join("\n");

    const { content, warnings } = convertSkillFrontmatter(input);

    expect(warnings).toHaveLength(0);
    expect(content).toContain("name: commit");
    expect(content).toContain("description: AI-aware git commit");
    expect(content).not.toContain("allowed-tools");
    expect(content).not.toContain("argument-hint");
    expect(content).toContain("Body content here");
  });

  test("preserves frontmatter when no unsupported fields present", () => {
    const input = [
      "---",
      "name: review",
      "description: Code review skill",
      "---",
      "Review body",
    ].join("\n");

    const { content } = convertSkillFrontmatter(input);

    expect(content).toContain("name: review");
    expect(content).toContain("description: Code review skill");
    expect(content).toContain("Review body");
  });

  test("truncates description exceeding 1024 characters and returns warning", () => {
    const longDesc = "X".repeat(1100);
    const input = `---\nname: verbose-skill\ndescription: ${longDesc}\n---\nBody content`;

    const { content, warnings } = convertSkillFrontmatter(input);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toInclude("1100");
    expect(warnings[0]).toInclude("1024");
    expect(content).toContain("name: verbose-skill");
    expect(content).toContain("Body content");
  });

  test("does not truncate description at exactly 1024 characters", () => {
    const exactDesc = "Y".repeat(1024);
    const input = `---\nname: exact-skill\ndescription: ${exactDesc}\n---\nBody content`;

    const { content, warnings } = convertSkillFrontmatter(input);

    expect(warnings).toHaveLength(0);
    expect(content).toContain("name: exact-skill");
  });

  test("strips fields from content with YAML-reserved characters via fallback", () => {
    const input = [
      "---",
      "name: expo-ui",
      "description: `@expo/ui/jetpack-compose` package",
      "allowed-tools: Bash, Read",
      "argument-hint: optional args",
      "---",
      "Body content here",
    ].join("\n");

    const { content } = convertSkillFrontmatter(input);

    expect(content).toContain("name: expo-ui");
    expect(content).toContain("`@expo/ui/jetpack-compose`");
    expect(content).not.toContain("allowed-tools");
    expect(content).not.toContain("argument-hint");
    expect(content).toContain("Body content here");
  });
});

describe("syncSkills", () => {
  let sourceDir: string;
  let destDir: string;

  beforeEach(() => {
    sourceDir = mkdtempSync(join(tmpdir(), "skill-sync-src-"));
    destDir = mkdtempSync(join(tmpdir(), "skill-sync-dest-"));
  });

  afterEach(() => {
    rmSync(sourceDir, { recursive: true, force: true });
    rmSync(destDir, { recursive: true, force: true });
  });

  test("copies full directory including supporting files", () => {
    const skill = createSkillDir(
      sourceDir,
      "commit",
      { name: "commit", description: "AI commit" },
      "Body",
      {
        "scripts/helper.ts": "export function help() {}",
        "references/guide.md": "# Guide",
      },
    );

    const results = syncSkills([skill], destDir);

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("synced");

    expect(existsSync(join(destDir, "commit", "SKILL.md"))).toBe(true);
    expect(existsSync(join(destDir, "commit", "scripts", "helper.ts"))).toBe(
      true,
    );
    expect(existsSync(join(destDir, "commit", "references", "guide.md"))).toBe(
      true,
    );

    expect(
      readFileSync(join(destDir, "commit", "scripts", "helper.ts"), "utf-8"),
    ).toBe("export function help() {}");
  });

  test("strips frontmatter in copied SKILL.md", () => {
    const skill = createSkillDir(
      sourceDir,
      "commit",
      {
        name: "commit",
        description: "AI commit",
        "allowed-tools": "Bash, Read",
        "argument-hint": "message",
      },
      "Commit body",
    );

    syncSkills([skill], destDir);

    const copiedContent = readFileSync(
      join(destDir, "commit", "SKILL.md"),
      "utf-8",
    );
    expect(copiedContent).toContain("name: commit");
    expect(copiedContent).toContain("description: AI commit");
    expect(copiedContent).not.toContain("allowed-tools");
    expect(copiedContent).not.toContain("argument-hint");
    expect(copiedContent).toContain("Commit body");
  });

  test("returns failed result with path when frontmatter validation fails", () => {
    const skillDir = join(sourceDir, "bad-skill");
    mkdirSync(skillDir, { recursive: true });
    const skillMdPath = join(skillDir, "SKILL.md");
    writeFileSync(skillMdPath, "---\ntitle: missing required fields\n---\nBody");

    const skill: DiscoveredSkill = {
      name: "bad-skill",
      sourceDir: skillDir,
      skillMdPath,
    };

    const results = syncSkills([skill], destDir);

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("failed");
    expect(results[0]!.reason).toContain(skillMdPath);
  });

  test("syncs skill with YAML-reserved characters in frontmatter and strips fields", () => {
    const skillDir = join(sourceDir, "expo-ui");
    mkdirSync(skillDir, { recursive: true });
    const skillMdPath = join(skillDir, "SKILL.md");
    writeFileSync(
      skillMdPath,
      [
        "---",
        "name: Expo UI",
        "description: `@expo/ui/jetpack-compose` uses Jetpack Compose",
        "allowed-tools: Bash, Read",
        "---",
        "Body",
      ].join("\n"),
    );

    const skill: DiscoveredSkill = {
      name: "expo-ui",
      sourceDir: skillDir,
      skillMdPath,
    };

    const results = syncSkills([skill], destDir);

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("synced");

    const output = readFileSync(join(destDir, "expo-ui", "SKILL.md"), "utf-8");
    expect(output).toContain("name: Expo UI");
    expect(output).toContain("`@expo/ui/jetpack-compose`");
    expect(output).not.toContain("allowed-tools");
  });

  test("overwrites existing skill with matching name, preserves non-conflicting skills", () => {
    // Pre-populate destination with an existing skill that will be overwritten
    const existingDir = join(destDir, "commit");
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(
      join(existingDir, "SKILL.md"),
      "---\nname: commit\ndescription: old\n---\nOld body",
    );

    // Pre-populate a non-conflicting skill
    const preservedDir = join(destDir, "review");
    mkdirSync(preservedDir, { recursive: true });
    writeFileSync(
      join(preservedDir, "SKILL.md"),
      "---\nname: review\ndescription: review skill\n---\nReview body",
    );

    const skill = createSkillDir(
      sourceDir,
      "commit",
      { name: "commit", description: "updated commit" },
      "New body",
    );

    const results = syncSkills([skill], destDir);

    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("synced");

    // Overwritten skill has new content
    const overwritten = readFileSync(
      join(destDir, "commit", "SKILL.md"),
      "utf-8",
    );
    expect(overwritten).toContain("description: updated commit");
    expect(overwritten).toContain("New body");

    // Non-conflicting skill is preserved
    expect(existsSync(join(destDir, "review", "SKILL.md"))).toBe(true);
    const preserved = readFileSync(
      join(destDir, "review", "SKILL.md"),
      "utf-8",
    );
    expect(preserved).toContain("review skill");
  });
});
