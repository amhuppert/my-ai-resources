import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { scanPlugins, extractSkills, discoverMcpServers } from "./artifact-discovery.ts";

function setupPluginDir(
  baseDir: string,
  pluginRelPath: string,
  skills: string[] = [],
): string {
  const pluginDir = join(baseDir, pluginRelPath);
  const claudePluginDir = join(pluginDir, ".claude-plugin");
  mkdirSync(claudePluginDir, { recursive: true });
  writeFileSync(
    join(claudePluginDir, "plugin.json"),
    JSON.stringify({ name: "test-plugin" }),
  );

  for (const skill of skills) {
    const skillDir = join(pluginDir, "skills", skill);
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      `---\nname: ${skill}\ndescription: ${skill} skill\n---\nBody of ${skill}`,
    );
  }

  return pluginDir;
}

describe("scanPlugins", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "discovery-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("discovers plugin at root level", () => {
    setupPluginDir(tempDir, "my-plugin");
    const plugins = scanPlugins(tempDir);
    expect(plugins).toHaveLength(1);
    expect(plugins[0]).toBe(join(tempDir, "my-plugin"));
  });

  test("discovers plugins at arbitrary nesting depth", () => {
    setupPluginDir(tempDir, "deep/nested/plugin");
    const plugins = scanPlugins(tempDir);
    expect(plugins).toHaveLength(1);
    expect(plugins[0]).toBe(join(tempDir, "deep", "nested", "plugin"));
  });

  test("discovers multiple plugins", () => {
    setupPluginDir(tempDir, "plugin-a");
    setupPluginDir(tempDir, "plugin-b");
    const plugins = scanPlugins(tempDir);
    expect(plugins).toHaveLength(2);
  });

  test("skips node_modules directories", () => {
    setupPluginDir(tempDir, "node_modules/some-pkg");
    const plugins = scanPlugins(tempDir);
    expect(plugins).toHaveLength(0);
  });

  test("skips dist directories", () => {
    setupPluginDir(tempDir, "dist/output-plugin");
    const plugins = scanPlugins(tempDir);
    expect(plugins).toHaveLength(0);
  });

  test("skips .git directories", () => {
    setupPluginDir(tempDir, ".git/objects/plugin");
    const plugins = scanPlugins(tempDir);
    expect(plugins).toHaveLength(0);
  });

  test("skips dotfile directories except .claude-plugin", () => {
    setupPluginDir(tempDir, ".hidden/plugin");
    const plugins = scanPlugins(tempDir);
    expect(plugins).toHaveLength(0);
  });

  test("returns empty array when no plugins found", () => {
    const plugins = scanPlugins(tempDir);
    expect(plugins).toHaveLength(0);
  });

  test("returns empty array when scan root doesn't exist", () => {
    const plugins = scanPlugins(join(tempDir, "nonexistent"));
    expect(plugins).toHaveLength(0);
  });
});

describe("extractSkills", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "skills-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("extracts skills from a plugin with skills directory", () => {
    const pluginDir = setupPluginDir(tempDir, "my-plugin", [
      "commit",
      "review",
    ]);
    const skills = extractSkills(pluginDir);
    expect(skills).toHaveLength(2);

    const names = skills.map((s) => s.name);
    expect(names).toContain("commit");
    expect(names).toContain("review");
  });

  test("sets correct sourceDir and skillMdPath", () => {
    const pluginDir = setupPluginDir(tempDir, "my-plugin", ["commit"]);
    const skills = extractSkills(pluginDir);
    expect(skills[0]!.sourceDir).toBe(join(pluginDir, "skills", "commit"));
    expect(skills[0]!.skillMdPath).toBe(
      join(pluginDir, "skills", "commit", "SKILL.md"),
    );
  });

  test("ignores subdirectories without SKILL.md", () => {
    const pluginDir = setupPluginDir(tempDir, "my-plugin", ["commit"]);
    mkdirSync(join(pluginDir, "skills", "empty-dir"), { recursive: true });
    const skills = extractSkills(pluginDir);
    expect(skills).toHaveLength(1);
  });

  test("returns empty array when plugin has no skills directory", () => {
    const pluginDir = join(tempDir, "no-skills-plugin");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      "{}",
    );
    const skills = extractSkills(pluginDir);
    expect(skills).toHaveLength(0);
  });
});

describe("discoverMcpServers", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mcp-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("parses MCP servers from JSON config", () => {
    const configPath = join(tempDir, ".mcp.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          "my-server": {
            command: "npx",
            args: ["-y", "my-server"],
            env: { API_KEY: "secret" },
          },
        },
      }),
    );

    const servers = discoverMcpServers(configPath);
    expect(servers).toHaveLength(1);
    expect(servers[0]!.id).toBe("my-server");
    expect(servers[0]!.command).toBe("npx");
    expect(servers[0]!.args).toEqual(["-y", "my-server"]);
    expect(servers[0]!.env).toEqual({ API_KEY: "secret" });
  });

  test("parses multiple MCP servers", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          server1: { command: "cmd1" },
          server2: { command: "cmd2", args: ["--port", "3000"] },
        },
      }),
    );

    const servers = discoverMcpServers(configPath);
    expect(servers).toHaveLength(2);
  });

  test("defaults args and env when not provided", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: { minimal: { command: "npx" } },
      }),
    );

    const servers = discoverMcpServers(configPath);
    expect(servers[0]!.args).toEqual([]);
    expect(servers[0]!.env).toEqual({});
  });

  test("returns empty array when file is missing", () => {
    const servers = discoverMcpServers(join(tempDir, "nonexistent.json"));
    expect(servers).toHaveLength(0);
  });

  test("returns empty array when no mcpServers key", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(configPath, JSON.stringify({ permissions: {} }));

    const servers = discoverMcpServers(configPath);
    expect(servers).toHaveLength(0);
  });
});
