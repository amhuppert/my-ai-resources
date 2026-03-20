import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { scanPlugins, extractSkills, discoverMcpServers, readInstalledPluginDirs, readPluginName, discoverStandaloneSkills, discoverCommands } from "./artifact-discovery.ts";

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

describe("readInstalledPluginDirs", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "installed-plugins-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("returns install paths for user-scope plugins", () => {
    const pluginsDir = join(tempDir, "plugins");
    mkdirSync(pluginsDir, { recursive: true });
    writeFileSync(
      join(pluginsDir, "installed_plugins.json"),
      JSON.stringify({
        version: 2,
        plugins: {
          "my-plugin@marketplace": [
            {
              scope: "user",
              installPath: "/path/to/plugin-a",
            },
          ],
          "another-plugin@marketplace": [
            {
              scope: "user",
              installPath: "/path/to/plugin-b",
            },
          ],
        },
      }),
    );

    const dirs = readInstalledPluginDirs(pluginsDir, "user");
    expect(dirs).toHaveLength(2);
    expect(dirs).toContain("/path/to/plugin-a");
    expect(dirs).toContain("/path/to/plugin-b");
  });

  test("filters out project-scope plugins for user scope", () => {
    const pluginsDir = join(tempDir, "plugins");
    mkdirSync(pluginsDir, { recursive: true });
    writeFileSync(
      join(pluginsDir, "installed_plugins.json"),
      JSON.stringify({
        version: 2,
        plugins: {
          "user-plugin@marketplace": [
            { scope: "user", installPath: "/path/to/user-plugin" },
          ],
          "project-plugin@marketplace": [
            {
              scope: "project",
              projectPath: "/some/project",
              installPath: "/path/to/project-plugin",
            },
          ],
        },
      }),
    );

    const dirs = readInstalledPluginDirs(pluginsDir, "user");
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe("/path/to/user-plugin");
  });

  test("returns project-scope plugins matching project path", () => {
    const pluginsDir = join(tempDir, "plugins");
    mkdirSync(pluginsDir, { recursive: true });
    writeFileSync(
      join(pluginsDir, "installed_plugins.json"),
      JSON.stringify({
        version: 2,
        plugins: {
          "project-plugin@marketplace": [
            {
              scope: "project",
              projectPath: "/my/project",
              installPath: "/path/to/project-plugin",
            },
          ],
          "other-project@marketplace": [
            {
              scope: "project",
              projectPath: "/other/project",
              installPath: "/path/to/other-plugin",
            },
          ],
        },
      }),
    );

    const dirs = readInstalledPluginDirs(pluginsDir, "project", "/my/project");
    expect(dirs).toHaveLength(1);
    expect(dirs[0]).toBe("/path/to/project-plugin");
  });

  test("returns empty array when installed_plugins.json does not exist", () => {
    const dirs = readInstalledPluginDirs(join(tempDir, "nonexistent"), "user");
    expect(dirs).toHaveLength(0);
  });

  test("returns empty array when JSON is malformed", () => {
    const pluginsDir = join(tempDir, "plugins");
    mkdirSync(pluginsDir, { recursive: true });
    writeFileSync(join(pluginsDir, "installed_plugins.json"), "not valid json");

    const dirs = readInstalledPluginDirs(pluginsDir, "user");
    expect(dirs).toHaveLength(0);
  });

  test("deduplicates install paths", () => {
    const pluginsDir = join(tempDir, "plugins");
    mkdirSync(pluginsDir, { recursive: true });
    writeFileSync(
      join(pluginsDir, "installed_plugins.json"),
      JSON.stringify({
        version: 2,
        plugins: {
          "plugin-a@m1": [
            { scope: "user", installPath: "/same/path" },
          ],
          "plugin-b@m2": [
            { scope: "user", installPath: "/same/path" },
          ],
        },
      }),
    );

    const dirs = readInstalledPluginDirs(pluginsDir, "user");
    expect(dirs).toHaveLength(1);
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

describe("readPluginName", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "plugin-name-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("returns name from valid plugin.json", () => {
    const pluginDir = join(tempDir, "my-plugin");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "my-plugin", version: "1.0.0" }),
    );

    expect(readPluginName(pluginDir)).toBe("my-plugin");
  });

  test("returns undefined when .claude-plugin directory is missing", () => {
    const pluginDir = join(tempDir, "no-plugin");
    mkdirSync(pluginDir, { recursive: true });

    expect(readPluginName(pluginDir)).toBeUndefined();
  });

  test("returns undefined when plugin.json has malformed JSON", () => {
    const pluginDir = join(tempDir, "bad-json");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      "not valid json",
    );

    expect(readPluginName(pluginDir)).toBeUndefined();
  });

  test("returns undefined when plugin.json has no name field", () => {
    const pluginDir = join(tempDir, "no-name");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ version: "1.0.0" }),
    );

    expect(readPluginName(pluginDir)).toBeUndefined();
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

  test("discovers HTTP/url-based MCP servers", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          "remote-server": {
            type: "http",
            url: "https://mcp.example.com/mcp",
          },
        },
      }),
    );

    const servers = discoverMcpServers(configPath);
    expect(servers).toHaveLength(1);
    expect(servers[0]!.id).toBe("remote-server");
    expect(servers[0]!.transport).toBe("http");
    if (servers[0]!.transport === "http") {
      expect(servers[0]!.url).toBe("https://mcp.example.com/mcp");
    }
  });

  test("discovers mixed stdio and HTTP servers", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          "local": { command: "node", args: ["server.js"] },
          "remote": { url: "https://example.com/mcp" },
        },
      }),
    );

    const servers = discoverMcpServers(configPath);
    expect(servers).toHaveLength(2);
    const local = servers.find((s) => s.id === "local");
    const remote = servers.find((s) => s.id === "remote");
    expect(local!.transport).toBe("stdio");
    expect(remote!.transport).toBe("http");
  });

  test("skips servers with unrecognized format", () => {
    const configPath = join(tempDir, "config.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        mcpServers: {
          "valid": { command: "node" },
          "invalid": { notCommand: true, notUrl: true },
        },
      }),
    );

    const servers = discoverMcpServers(configPath);
    expect(servers).toHaveLength(1);
    expect(servers[0]!.id).toBe("valid");
  });
});

describe("discoverStandaloneSkills", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "standalone-skills-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("discovers skill directories containing SKILL.md", () => {
    const skillDir = join(tempDir, "my-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      "---\nname: my-skill\ndescription: A skill\n---\nBody",
    );

    const skills = discoverStandaloneSkills(tempDir);
    expect(skills).toHaveLength(1);
    expect(skills[0]!.name).toBe("my-skill");
    expect(skills[0]!.sourceDir).toBe(skillDir);
    expect(skills[0]!.skillMdPath).toBe(join(skillDir, "SKILL.md"));
  });

  test("discovers multiple skills", () => {
    for (const name of ["skill-a", "skill-b"]) {
      const dir = join(tempDir, name);
      mkdirSync(dir, { recursive: true });
      writeFileSync(
        join(dir, "SKILL.md"),
        `---\nname: ${name}\ndescription: ${name}\n---\nBody`,
      );
    }

    const skills = discoverStandaloneSkills(tempDir);
    expect(skills).toHaveLength(2);
  });

  test("ignores directories without SKILL.md", () => {
    const emptyDir = join(tempDir, "empty");
    mkdirSync(emptyDir, { recursive: true });
    writeFileSync(join(emptyDir, "README.md"), "Not a skill");

    const skills = discoverStandaloneSkills(tempDir);
    expect(skills).toHaveLength(0);
  });

  test("returns empty array when directory does not exist", () => {
    const skills = discoverStandaloneSkills(join(tempDir, "nonexistent"));
    expect(skills).toHaveLength(0);
  });

  test("ignores files that are not directories", () => {
    writeFileSync(join(tempDir, "not-a-dir.md"), "Just a file");

    const skills = discoverStandaloneSkills(tempDir);
    expect(skills).toHaveLength(0);
  });
});

describe("discoverCommands", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "commands-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("discovers top-level command files", () => {
    writeFileSync(
      join(tempDir, "audit-standards.md"),
      "---\ndescription: Audit standards\n---\nBody",
    );

    const commands = discoverCommands(tempDir);
    expect(commands).toHaveLength(1);
    expect(commands[0]!.name).toBe("audit-standards");
    expect(commands[0]!.sourcePath).toBe(join(tempDir, "audit-standards.md"));
  });

  test("discovers namespaced commands in subdirectories", () => {
    const nsDir = join(tempDir, "kiro");
    mkdirSync(nsDir, { recursive: true });
    writeFileSync(
      join(nsDir, "spec-init.md"),
      "---\ndescription: Init spec\n---\nBody",
    );

    const commands = discoverCommands(tempDir);
    expect(commands).toHaveLength(1);
    expect(commands[0]!.name).toBe("kiro--spec-init");
  });

  test("discovers mixed top-level and namespaced commands", () => {
    writeFileSync(
      join(tempDir, "top-level.md"),
      "---\ndescription: Top level\n---\nBody",
    );
    const nsDir = join(tempDir, "ns");
    mkdirSync(nsDir, { recursive: true });
    writeFileSync(
      join(nsDir, "nested.md"),
      "---\ndescription: Nested\n---\nBody",
    );

    const commands = discoverCommands(tempDir);
    expect(commands).toHaveLength(2);
    const names = commands.map((c) => c.name);
    expect(names).toContain("top-level");
    expect(names).toContain("ns--nested");
  });

  test("ignores non-.md files", () => {
    writeFileSync(join(tempDir, "not-a-command.txt"), "Not a command");
    writeFileSync(join(tempDir, "also-not.json"), "{}");

    const commands = discoverCommands(tempDir);
    expect(commands).toHaveLength(0);
  });

  test("returns empty array when directory does not exist", () => {
    const commands = discoverCommands(join(tempDir, "nonexistent"));
    expect(commands).toHaveLength(0);
  });

  test("discovers multiple commands in a namespace subdirectory", () => {
    const nsDir = join(tempDir, "kiro");
    mkdirSync(nsDir, { recursive: true });
    writeFileSync(join(nsDir, "spec-init.md"), "---\ndescription: Init\n---\n");
    writeFileSync(join(nsDir, "spec-design.md"), "---\ndescription: Design\n---\n");
    writeFileSync(join(nsDir, "steering.md"), "---\ndescription: Steer\n---\n");

    const commands = discoverCommands(tempDir);
    expect(commands).toHaveLength(3);
    const names = commands.map((c) => c.name);
    expect(names).toContain("kiro--spec-init");
    expect(names).toContain("kiro--spec-design");
    expect(names).toContain("kiro--steering");
  });
});
