import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import matter from "gray-matter";
import { convertCommandToSkill, syncCommands } from "./command-sync.ts";
import type { DiscoveredCommand } from "./types.ts";

describe("convertCommandToSkill", () => {
  test("strips allowed-tools, argument-hint, and required-context", () => {
    const content = matter.stringify("Command body", {
      name: "audit",
      description: "Audit things",
      "allowed-tools": ["Read", "Grep"],
      "argument-hint": "<pattern>",
      "required-context": "Some context",
    });

    const { content: result } = convertCommandToSkill(content, "audit");
    const { data } = matter(result);
    expect(data["name"]).toBe("audit");
    expect(data["description"]).toBe("Audit things");
    expect(data["allowed-tools"]).toBeUndefined();
    expect(data["argument-hint"]).toBeUndefined();
    expect(data["required-context"]).toBeUndefined();
  });

  test("preserves body content unchanged", () => {
    const content = matter.stringify("# Command\n\nDo the thing.", {
      name: "test",
      description: "Test command",
    });

    const { content: result } = convertCommandToSkill(content, "test");
    const { content: body } = matter(result);
    expect(body.trim()).toBe("# Command\n\nDo the thing.");
  });

  test("injects name field when missing from frontmatter", () => {
    const content = matter.stringify("Body", {
      description: "A namespaced command",
    });

    const { content: result } = convertCommandToSkill(content, "kiro--spec-init");
    const { data } = matter(result);
    expect(data["name"]).toBe("kiro--spec-init");
    expect(data["description"]).toBe("A namespaced command");
  });

  test("preserves existing name when present in frontmatter", () => {
    const content = matter.stringify("Body", {
      name: "custom-name",
      description: "Has a name",
    });

    const { content: result } = convertCommandToSkill(content, "derived-name");
    const { data } = matter(result);
    expect(data["name"]).toBe("custom-name");
  });

  test("truncates long descriptions with warning", () => {
    const longDesc = "x".repeat(2000);
    const content = matter.stringify("Body", {
      name: "long",
      description: longDesc,
    });

    const { content: result, warnings } = convertCommandToSkill(content, "long");
    const { data } = matter(result);
    expect((data["description"] as string).length).toBeLessThanOrEqual(1024);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("truncated");
  });
});

describe("syncCommands", () => {
  let tempDir: string;
  let destDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "cmd-sync-test-"));
    destDir = join(tempDir, "dest-skills");
    mkdirSync(destDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("converts a command to a skill directory with SKILL.md", () => {
    const cmdPath = join(tempDir, "audit.md");
    writeFileSync(
      cmdPath,
      matter.stringify("Audit body", {
        name: "audit",
        description: "Audit standards",
        "allowed-tools": ["Read"],
      }),
    );

    const commands: DiscoveredCommand[] = [
      { name: "audit", sourcePath: cmdPath },
    ];

    const results = syncCommands(commands, destDir);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("synced");
    expect(results[0]!.artifact).toBe("command:audit");

    const skillMdPath = join(destDir, "audit", "SKILL.md");
    expect(existsSync(skillMdPath)).toBe(true);

    const { data } = matter(readFileSync(skillMdPath, "utf-8"));
    expect(data["name"]).toBe("audit");
    expect(data["description"]).toBe("Audit standards");
    expect(data["allowed-tools"]).toBeUndefined();
  });

  test("creates skill directory for namespaced command", () => {
    const cmdPath = join(tempDir, "spec-init.md");
    writeFileSync(
      cmdPath,
      matter.stringify("Init body", {
        description: "Initialize spec",
        "argument-hint": "<desc>",
      }),
    );

    const commands: DiscoveredCommand[] = [
      { name: "kiro--spec-init", sourcePath: cmdPath },
    ];

    const results = syncCommands(commands, destDir);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("synced");

    const skillMdPath = join(destDir, "kiro--spec-init", "SKILL.md");
    expect(existsSync(skillMdPath)).toBe(true);

    const { data } = matter(readFileSync(skillMdPath, "utf-8"));
    expect(data["name"]).toBe("kiro--spec-init");
    expect(data["argument-hint"]).toBeUndefined();
  });

  test("fails gracefully when command file cannot be read", () => {
    const commands: DiscoveredCommand[] = [
      { name: "missing", sourcePath: join(tempDir, "nonexistent.md") },
    ];

    const results = syncCommands(commands, destDir);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("failed");
    expect(results[0]!.artifact).toBe("command:missing");
  });

  test("fails when command has no description", () => {
    const cmdPath = join(tempDir, "no-desc.md");
    writeFileSync(
      cmdPath,
      matter.stringify("Body", { name: "no-desc" }),
    );

    const commands: DiscoveredCommand[] = [
      { name: "no-desc", sourcePath: cmdPath },
    ];

    const results = syncCommands(commands, destDir);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("failed");
  });

  test("syncs multiple commands", () => {
    for (const name of ["cmd-a", "cmd-b"]) {
      const cmdPath = join(tempDir, `${name}.md`);
      writeFileSync(
        cmdPath,
        matter.stringify(`${name} body`, {
          name,
          description: `${name} desc`,
        }),
      );
    }

    const commands: DiscoveredCommand[] = [
      { name: "cmd-a", sourcePath: join(tempDir, "cmd-a.md") },
      { name: "cmd-b", sourcePath: join(tempDir, "cmd-b.md") },
    ];

    const results = syncCommands(commands, destDir);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "synced")).toBe(true);
    expect(existsSync(join(destDir, "cmd-a", "SKILL.md"))).toBe(true);
    expect(existsSync(join(destDir, "cmd-b", "SKILL.md"))).toBe(true);
  });

  test("overwrites existing skill directory", () => {
    const existingDir = join(destDir, "audit");
    mkdirSync(existingDir, { recursive: true });
    writeFileSync(join(existingDir, "SKILL.md"), "# Old content");

    const cmdPath = join(tempDir, "audit.md");
    writeFileSync(
      cmdPath,
      matter.stringify("New body", {
        name: "audit",
        description: "Updated audit",
      }),
    );

    const commands: DiscoveredCommand[] = [
      { name: "audit", sourcePath: cmdPath },
    ];

    const results = syncCommands(commands, destDir);
    expect(results).toHaveLength(1);
    expect(results[0]!.status).toBe("synced");

    const content = readFileSync(join(destDir, "audit", "SKILL.md"), "utf-8");
    expect(content).toContain("New body");
    expect(content).not.toContain("Old content");
  });
});
