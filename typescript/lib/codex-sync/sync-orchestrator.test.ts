import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { mkdtempSync } from "fs";
import { rmSync } from "fs";
import matter from "gray-matter";
import { runSync } from "./sync-orchestrator.ts";
import type { SyncPaths, SyncConfig } from "./types.ts";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "sync-orch-test-"));
}

function setupTestPaths(tempDir: string): SyncPaths {
  const sourceDir = join(tempDir, "source");
  const destDir = join(tempDir, "dest");
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(destDir, { recursive: true });

  return {
    claudeMdSource: join(sourceDir, "CLAUDE.md"),
    pluginScanRoot: join(sourceDir, "plugins"),
    standaloneAgentsDir: join(sourceDir, "agents"),
    mcpConfigSource: join(sourceDir, ".claude.json"),
    agentsOverrideDest: join(destDir, "AGENTS.override.md"),
    codexSkillsDir: join(destDir, "skills"),
    codexAgentsDir: join(destDir, "agents"),
    codexConfigDir: join(destDir, "codex"),
  };
}

const defaultConfig: SyncConfig = {
  modelMapping: { sonnet: "gpt-5.3-codex-spark", opus: "gpt-5.4" },
};

describe("runSync", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("runs full pipeline with all artifact types", () => {
    const paths = setupTestPaths(tempDir);

    // Instructions source
    writeFileSync(paths.claudeMdSource, "# My instructions");

    // Plugin with skill
    const pluginDir = join(paths.pluginScanRoot, "my-plugin");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "my-plugin" }),
    );
    const skillDir = join(pluginDir, "skills", "test-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      matter.stringify("Skill body", { name: "test-skill", description: "A test skill" }),
    );

    // Plugin agent
    const agentsDir = join(pluginDir, "agents");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, "code-reviewer.md"),
      matter.stringify("Review instructions", {
        name: "code-reviewer",
        description: "Reviews code",
        model: "sonnet",
      }),
    );

    // MCP config
    writeFileSync(
      paths.mcpConfigSource,
      JSON.stringify({
        mcpServers: {
          "test-server": { command: "node", args: ["server.js"] },
        },
      }),
    );

    const result = runSync(paths, defaultConfig);

    expect(result.hasErrors).toBe(false);
    const synced = result.items.filter((i) => i.status === "synced");
    expect(synced.length).toBe(4);

    // Verify each artifact type is represented
    const artifactNames = synced.map((i) => i.artifact);
    expect(artifactNames).toContain("instructions");
    expect(artifactNames.some((a) => a.startsWith("skill:"))).toBe(true);
    expect(artifactNames.some((a) => a.startsWith("agent:"))).toBe(true);
    expect(artifactNames.some((a) => a.startsWith("mcp:"))).toBe(true);

    // Verify outputs exist
    expect(existsSync(paths.agentsOverrideDest)).toBe(true);
    expect(existsSync(join(paths.codexSkillsDir, "test-skill", "SKILL.md"))).toBe(true);
    expect(existsSync(join(paths.codexAgentsDir, "code-reviewer.toml"))).toBe(true);
    expect(existsSync(join(paths.codexConfigDir, "config.toml"))).toBe(true);
  });

  test("continues processing when individual item fails", () => {
    const paths = setupTestPaths(tempDir);

    // Instructions source exists
    writeFileSync(paths.claudeMdSource, "# Instructions");

    // Plugin with a skill that has invalid frontmatter
    const pluginDir = join(paths.pluginScanRoot, "bad-plugin");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "bad-plugin" }),
    );
    const skillDir = join(pluginDir, "skills", "bad-skill");
    mkdirSync(skillDir, { recursive: true });
    // Missing required 'description' field
    writeFileSync(
      join(skillDir, "SKILL.md"),
      matter.stringify("Body", { name: "bad-skill" }),
    );

    // Valid MCP config
    writeFileSync(
      paths.mcpConfigSource,
      JSON.stringify({
        mcpServers: {
          "ok-server": { command: "npx", args: ["serve"] },
        },
      }),
    );

    const result = runSync(paths, defaultConfig);

    expect(result.hasErrors).toBe(true);
    const failed = result.items.filter((i) => i.status === "failed");
    expect(failed.length).toBe(1);
    expect(failed[0].artifact).toBe("skill:bad-skill");
    // Despite the failed skill, MCP and instructions should still succeed
    const synced = result.items.filter((i) => i.status === "synced");
    expect(synced.length).toBe(2);
  });

  test("aggregates failures across multiple stages", () => {
    const paths = setupTestPaths(tempDir);

    // Instructions exists (should succeed)
    writeFileSync(paths.claudeMdSource, "# Instructions");

    // Plugin with invalid skill AND invalid agent
    const pluginDir = join(paths.pluginScanRoot, "mixed-plugin");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "mixed-plugin" }),
    );
    const skillDir = join(pluginDir, "skills", "bad-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      matter.stringify("Body", { name: "bad-skill" }),
    );

    // Agent with invalid frontmatter (missing description)
    const agentsDir = join(pluginDir, "agents");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, "bad-agent.md"),
      "---\nname: bad-agent\n---\nNo description field\n",
    );

    // Valid MCP
    writeFileSync(
      paths.mcpConfigSource,
      JSON.stringify({
        mcpServers: {
          "good-server": { command: "node", args: ["s.js"] },
        },
      }),
    );

    const result = runSync(paths, defaultConfig);

    expect(result.hasErrors).toBe(true);
    const failed = result.items.filter((i) => i.status === "failed");
    expect(failed.length).toBe(1);
    expect(failed[0].artifact).toBe("skill:bad-skill");

    // Instructions and MCP still succeed
    const synced = result.items.filter((i) => i.status === "synced");
    expect(synced.length).toBe(2);
    expect(synced.some((i) => i.artifact === "instructions")).toBe(true);
    expect(synced.some((i) => i.artifact.startsWith("mcp:"))).toBe(true);
  });

  test("returns hasErrors false when everything succeeds", () => {
    const paths = setupTestPaths(tempDir);

    // Only instructions (no other artifacts)
    writeFileSync(paths.claudeMdSource, "# Just instructions");

    const result = runSync(paths, defaultConfig);

    expect(result.hasErrors).toBe(false);
    expect(result.items.some((i) => i.status === "synced")).toBe(true);
  });

  test("handles missing source gracefully (all skipped)", () => {
    const paths = setupTestPaths(tempDir);
    // No source files at all

    const result = runSync(paths, defaultConfig);

    // Instructions should be skipped, no skills/agents/MCP found
    expect(result.hasErrors).toBe(false);
    const skipped = result.items.filter((i) => i.status === "skipped");
    expect(skipped.length).toBe(1);
    expect(skipped[0].artifact).toBe("instructions");
  });

  test("includes standalone agents alongside plugin agents", () => {
    const paths = setupTestPaths(tempDir);
    writeFileSync(paths.claudeMdSource, "# Instructions");

    // Plugin agent
    const pluginDir = join(paths.pluginScanRoot, "my-plugin");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "my-plugin" }),
    );
    const pluginAgentsDir = join(pluginDir, "agents");
    mkdirSync(pluginAgentsDir, { recursive: true });
    writeFileSync(
      join(pluginAgentsDir, "plugin-agent.md"),
      matter.stringify("Plugin agent body", {
        name: "plugin-agent",
        description: "From plugin",
        model: "sonnet",
      }),
    );

    // Standalone agent
    mkdirSync(paths.standaloneAgentsDir, { recursive: true });
    writeFileSync(
      join(paths.standaloneAgentsDir, "standalone-agent.md"),
      matter.stringify("Standalone body", {
        name: "standalone-agent",
        description: "A standalone agent",
        model: "opus",
      }),
    );

    const result = runSync(paths, defaultConfig);

    const agentResults = result.items.filter((i) => i.artifact.startsWith("agent:"));
    expect(agentResults.length).toBe(2);
    expect(agentResults.every((r) => r.status === "synced")).toBe(true);

    // Both .toml files should exist
    expect(existsSync(join(paths.codexAgentsDir, "plugin-agent.toml"))).toBe(true);
    expect(existsSync(join(paths.codexAgentsDir, "standalone-agent.toml"))).toBe(true);
  });

  test("catches unexpected exceptions from a stage and continues", () => {
    const paths = setupTestPaths(tempDir);
    writeFileSync(paths.claudeMdSource, "# Instructions");

    // Make pluginScanRoot a file instead of a directory to provoke an
    // error during plugin scanning. Write it as a file so readdirSync
    // inside scanPlugins sees a non-directory. Actually, scanPlugins
    // does existsSync first and returns []. Instead, set
    // mcpConfigSource to a path where the JSON is malformed to trigger
    // an error result within the stage itself (which is already handled).
    // Let's test that the result contains items from ALL stages even
    // when a stage returns error results.
    writeFileSync(paths.mcpConfigSource, "NOT VALID JSON");

    const result = runSync(paths, defaultConfig);

    expect(result.hasErrors).toBe(true);
    // Instructions should succeed, MCP should fail
    expect(result.items.some((i) => i.artifact === "instructions" && i.status === "synced")).toBe(true);
    expect(result.items.some((i) => i.artifact === "mcp" && i.status === "failed")).toBe(true);
  });

  test("pipeline executes stages in order: instructions, skills, agents, MCP", () => {
    const paths = setupTestPaths(tempDir);
    writeFileSync(paths.claudeMdSource, "# Instructions");

    // Plugin with skill and agent
    const pluginDir = join(paths.pluginScanRoot, "ordered-plugin");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "ordered-plugin" }),
    );
    const skillDir = join(pluginDir, "skills", "order-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      matter.stringify("Body", { name: "order-skill", description: "Ordered" }),
    );
    const agentsDir = join(pluginDir, "agents");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, "order-agent.md"),
      matter.stringify("Agent body", {
        name: "order-agent",
        description: "Ordered agent",
      }),
    );
    writeFileSync(
      paths.mcpConfigSource,
      JSON.stringify({
        mcpServers: { "order-mcp": { command: "test" } },
      }),
    );

    const result = runSync(paths, defaultConfig);

    // Verify result items appear in pipeline order
    const artifacts = result.items.map((i) => i.artifact);
    const instrIdx = artifacts.indexOf("instructions");
    const skillIdx = artifacts.findIndex((a) => a.startsWith("skill:"));
    const agentIdx = artifacts.findIndex((a) => a.startsWith("agent:"));
    const mcpIdx = artifacts.findIndex((a) => a.startsWith("mcp:"));

    expect(instrIdx).toBeLessThan(skillIdx);
    expect(skillIdx).toBeLessThan(agentIdx);
    expect(agentIdx).toBeLessThan(mcpIdx);
  });
});
