import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import {
  titleCaseSkillName,
  validateSkillName,
  validateSkill,
  initSkill,
} from "./skill-operations";
import type { InstallConfig } from "./install-types";

describe("titleCaseSkillName", () => {
  test("converts single word", () => {
    expect(titleCaseSkillName("skill")).toBe("Skill");
  });

  test("converts hyphenated name", () => {
    expect(titleCaseSkillName("my-test-skill")).toBe("My Test Skill");
  });

  test("converts with numbers", () => {
    expect(titleCaseSkillName("api-v2-client")).toBe("Api V2 Client");
  });
});

describe("validateSkillName", () => {
  test("accepts valid hyphen-case name", () => {
    const result = validateSkillName("my-test-skill");
    expect(result.valid).toBe(true);
  });

  test("accepts name with numbers", () => {
    const result = validateSkillName("api-v2");
    expect(result.valid).toBe(true);
  });

  test("accepts single word", () => {
    const result = validateSkillName("skill");
    expect(result.valid).toBe(true);
  });

  test("rejects uppercase letters", () => {
    const result = validateSkillName("My-Skill");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("hyphen-case");
  });

  test("rejects underscores", () => {
    const result = validateSkillName("my_skill");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("hyphen-case");
  });

  test("rejects spaces", () => {
    const result = validateSkillName("my skill");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("hyphen-case");
  });

  test("rejects name starting with hyphen", () => {
    const result = validateSkillName("-skill");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("cannot start or end");
  });

  test("rejects name ending with hyphen", () => {
    const result = validateSkillName("skill-");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("cannot start or end");
  });

  test("rejects consecutive hyphens", () => {
    const result = validateSkillName("my--skill");
    expect(result.valid).toBe(false);
    expect(result.message).toContain("consecutive hyphens");
  });

  test("rejects name longer than 40 characters", () => {
    const result = validateSkillName("a".repeat(41));
    expect(result.valid).toBe(false);
    expect(result.message).toContain("too long");
  });
});

describe("validateSkill", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = join(tmpdir(), `test-skill-${Date.now()}-${Math.random()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test("validates a valid skill", async () => {
    const skillMd = `---
name: test-skill
description: A test skill
---

# Test Skill

Content here.
`;
    const skillMdPath = join(tempDir, "SKILL.md");
    Bun.write(skillMdPath, skillMd);

    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(true);
    expect(result.message).toBe("Skill is valid!");
  });

  test("fails when SKILL.md does not exist", async () => {
    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("not found");
  });

  test("fails when no frontmatter", async () => {
    const skillMd = "# Test Skill\n\nNo frontmatter.";
    const skillMdPath = join(tempDir, "SKILL.md");
    Bun.write(skillMdPath, skillMd);

    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("No YAML frontmatter");
  });

  test("fails when frontmatter not properly closed", async () => {
    const skillMd = `---
name: test-skill
description: Test

# Missing closing ---
`;
    const skillMdPath = join(tempDir, "SKILL.md");
    Bun.write(skillMdPath, skillMd);

    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Invalid frontmatter format");
  });

  test("fails when name field missing", async () => {
    const skillMd = `---
description: Test skill
---

# Test
`;
    const skillMdPath = join(tempDir, "SKILL.md");
    Bun.write(skillMdPath, skillMd);

    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Missing 'name'");
  });

  test("fails when description field missing", async () => {
    const skillMd = `---
name: test-skill
---

# Test
`;
    const skillMdPath = join(tempDir, "SKILL.md");
    Bun.write(skillMdPath, skillMd);

    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("Missing 'description'");
  });

  test("fails when name is not hyphen-case", async () => {
    const skillMd = `---
name: TestSkill
description: Test
---

# Test
`;
    const skillMdPath = join(tempDir, "SKILL.md");
    Bun.write(skillMdPath, skillMd);

    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("hyphen-case");
  });

  test("fails when name has consecutive hyphens", async () => {
    const skillMd = `---
name: test--skill
description: Test
---

# Test
`;
    const skillMdPath = join(tempDir, "SKILL.md");
    Bun.write(skillMdPath, skillMd);

    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("consecutive hyphens");
  });

  test("fails when description contains angle brackets", async () => {
    const skillMd = `---
name: test-skill
description: A <test> skill
---

# Test
`;
    const skillMdPath = join(tempDir, "SKILL.md");
    Bun.write(skillMdPath, skillMd);

    const result = await validateSkill(tempDir);
    expect(result.valid).toBe(false);
    expect(result.message).toContain("angle brackets");
  });
});

describe("initSkill", () => {
  let tempDir: string;
  let config: InstallConfig;

  beforeEach(() => {
    tempDir = join(tmpdir(), `test-init-${Date.now()}-${Math.random()}`);
    mkdirSync(tempDir, { recursive: true });

    config = {
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

  test("creates skill in project scope", async () => {
    await initSkill("test-skill", "project", config);

    const skillDir = join(
      config.paths.projectClaudeDir,
      "skills",
      "test-skill",
    );
    expect(existsSync(skillDir)).toBe(true);
    expect(existsSync(join(skillDir, "SKILL.md"))).toBe(true);
    expect(existsSync(join(skillDir, "references", "api_reference.md"))).toBe(
      true,
    );
    expect(existsSync(join(skillDir, "assets", "example_asset.txt"))).toBe(
      true,
    );
  });

  test("creates skill in user scope", async () => {
    await initSkill("test-skill", "user", config);

    const skillDir = join(config.paths.userClaudeDir, "skills", "test-skill");
    expect(existsSync(skillDir)).toBe(true);
    expect(existsSync(join(skillDir, "SKILL.md"))).toBe(true);
  });

  test("SKILL.md contains correct frontmatter", async () => {
    await initSkill("my-test-skill", "project", config);

    const skillMdPath = join(
      config.paths.projectClaudeDir,
      "skills",
      "my-test-skill",
      "SKILL.md",
    );
    const content = readFileSync(skillMdPath, "utf-8");

    expect(content).toContain("name: my-test-skill");
    expect(content).toContain("# My Test Skill");
  });

  test("SKILL.md includes helper command guidance", async () => {
    await initSkill("test-skill", "project", config);

    const skillMdPath = join(
      config.paths.projectClaudeDir,
      "skills",
      "test-skill",
      "SKILL.md",
    );
    const content = readFileSync(skillMdPath, "utf-8");

    expect(content).toContain("## Helper Commands");
    expect(content).toContain("ai skill test-skill");
  });

  test("throws error for invalid skill name", async () => {
    await expect(
      initSkill("Invalid-Name", "project", config),
    ).rejects.toThrow();
  });

  test("throws error when skill already exists", async () => {
    await initSkill("test-skill", "project", config);

    await expect(initSkill("test-skill", "project", config)).rejects.toThrow(
      /already exists/,
    );
  });

  test("throws error for name with consecutive hyphens", async () => {
    await expect(initSkill("test--skill", "project", config)).rejects.toThrow(
      /consecutive hyphens/,
    );
  });

  test("throws error for name starting with hyphen", async () => {
    await expect(initSkill("-test", "project", config)).rejects.toThrow(
      /cannot start or end/,
    );
  });
});
