import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { discoverAgents } from "./agent-discovery.ts";

function makeAgentMd(name: string, description: string, extra = ""): string {
  return `---\nname: ${name}\ndescription: ${description}\n${extra}---\n# ${name}\nAgent body content`;
}

function setupPluginWithAgents(
  baseDir: string,
  pluginRelPath: string,
  agents: { name: string; subdir?: string; extra?: string }[],
): string {
  const pluginDir = join(baseDir, pluginRelPath);
  const claudePluginDir = join(pluginDir, ".claude-plugin");
  mkdirSync(claudePluginDir, { recursive: true });
  writeFileSync(
    join(claudePluginDir, "plugin.json"),
    JSON.stringify({ name: "test-plugin" }),
  );

  const agentsDir = join(pluginDir, "agents");
  mkdirSync(agentsDir, { recursive: true });

  for (const agent of agents) {
    const dir = agent.subdir
      ? join(agentsDir, agent.subdir)
      : agentsDir;
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, `${agent.name}.md`),
      makeAgentMd(agent.name, `${agent.name} description`, agent.extra),
    );
  }

  return pluginDir;
}

describe("discoverAgents", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "agent-discovery-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("discovers agents directly in plugin agents directory", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "code-reviewer" },
        { name: "test-runner" },
      ]),
    ];

    const { agents } = discoverAgents(pluginDirs, join(tempDir, "standalone"));
    expect(agents).toHaveLength(2);

    const names = agents.map((a) => a.name);
    expect(names).toContain("code-reviewer");
    expect(names).toContain("test-runner");
    expect(agents[0]!.source).toBe("plugin");
  });

  test("discovers agents in subdirectories one level deep", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "design-agent", subdir: "design" },
      ]),
    ];

    const { agents } = discoverAgents(pluginDirs, join(tempDir, "standalone"));
    expect(agents).toHaveLength(1);
    expect(agents[0]!.name).toBe("design-agent");
  });

  test("excludes files in references subdirectory", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "valid-agent" },
      ]),
    ];
    const agentsDir = join(pluginDirs[0]!, "agents", "references");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, "some-ref.md"),
      makeAgentMd("some-ref", "reference doc"),
    );

    const { agents } = discoverAgents(pluginDirs, join(tempDir, "standalone"));
    expect(agents).toHaveLength(1);
    expect(agents[0]!.name).toBe("valid-agent");
  });

  test("excludes files in assets subdirectory", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "valid-agent" },
      ]),
    ];
    const assetsDir = join(pluginDirs[0]!, "agents", "assets");
    mkdirSync(assetsDir, { recursive: true });
    writeFileSync(
      join(assetsDir, "asset.md"),
      makeAgentMd("asset", "asset file"),
    );

    const { agents } = discoverAgents(pluginDirs, join(tempDir, "standalone"));
    expect(agents).toHaveLength(1);
  });

  test("excludes files in scripts subdirectory", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "valid-agent" },
      ]),
    ];
    const scriptsDir = join(pluginDirs[0]!, "agents", "scripts");
    mkdirSync(scriptsDir, { recursive: true });
    writeFileSync(
      join(scriptsDir, "helper.md"),
      makeAgentMd("helper", "script helper"),
    );

    const { agents } = discoverAgents(pluginDirs, join(tempDir, "standalone"));
    expect(agents).toHaveLength(1);
  });

  test("skips markdown files without valid frontmatter", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "valid-agent" },
      ]),
    ];
    const agentsDir = join(pluginDirs[0]!, "agents");
    writeFileSync(join(agentsDir, "no-frontmatter.md"), "# Just a heading\nNo frontmatter here.");
    writeFileSync(join(agentsDir, "missing-name.md"), "---\ndescription: has desc but no name\n---\nBody");

    const { agents, skipped } = discoverAgents(pluginDirs, join(tempDir, "standalone"));
    expect(agents).toHaveLength(1);
    expect(agents[0]!.name).toBe("valid-agent");
    // missing-name.md has frontmatter but fails schema — should be reported as skipped
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.name).toBe("missing-name");
  });

  test("discovers standalone agents alongside plugin agents", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "plugin-agent" },
      ]),
    ];
    const standaloneDir = join(tempDir, "standalone-agents");
    mkdirSync(standaloneDir, { recursive: true });
    writeFileSync(
      join(standaloneDir, "standalone-agent.md"),
      makeAgentMd("standalone-agent", "A standalone agent"),
    );

    const { agents } = discoverAgents(pluginDirs, standaloneDir);
    expect(agents).toHaveLength(2);

    const pluginAgent = agents.find((a) => a.name === "plugin-agent");
    const standaloneAgent = agents.find((a) => a.name === "standalone-agent");
    expect(pluginAgent!.source).toBe("plugin");
    expect(standaloneAgent!.source).toBe("standalone");
  });

  test("handles missing standalone agents directory gracefully", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "plugin-agent" },
      ]),
    ];

    const { agents } = discoverAgents(pluginDirs, join(tempDir, "nonexistent"));
    expect(agents).toHaveLength(1);
  });

  test("handles plugin without agents directory", () => {
    const pluginDir = join(tempDir, "no-agents-plugin");
    const claudePluginDir = join(pluginDir, ".claude-plugin");
    mkdirSync(claudePluginDir, { recursive: true });
    writeFileSync(
      join(claudePluginDir, "plugin.json"),
      JSON.stringify({ name: "test-plugin" }),
    );

    const { agents } = discoverAgents([pluginDir], join(tempDir, "standalone"));
    expect(agents).toHaveLength(0);
  });

  test("handles standalone agents in subdirectories", () => {
    const standaloneDir = join(tempDir, "standalone-agents");
    const subDir = join(standaloneDir, "design");
    mkdirSync(subDir, { recursive: true });
    writeFileSync(
      join(subDir, "design-agent.md"),
      makeAgentMd("design-agent", "A design agent"),
    );

    const { agents } = discoverAgents([], standaloneDir);
    expect(agents).toHaveLength(1);
    expect(agents[0]!.name).toBe("design-agent");
    expect(agents[0]!.source).toBe("standalone");
  });

  test("reports agents with frontmatter that fails schema validation as skipped", () => {
    const pluginDirs = [
      setupPluginWithAgents(tempDir, "my-plugin", [
        { name: "valid-agent" },
      ]),
    ];
    const agentsDir = join(pluginDirs[0]!, "agents");
    writeFileSync(
      join(agentsDir, "bad-desc.md"),
      "---\nname: bad-desc\ndescription: some text\n  nested: value\n---\nBody",
    );

    const { agents, skipped } = discoverAgents(pluginDirs, join(tempDir, "standalone"));
    expect(agents).toHaveLength(1);
    expect(agents[0]!.name).toBe("valid-agent");
    expect(skipped).toHaveLength(1);
    expect(skipped[0]!.name).toBe("bad-desc");
    expect(skipped[0]!.reason).toBeDefined();
  });
});
