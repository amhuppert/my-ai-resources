import { describe, expect, test } from "bun:test";
import type {
  SyncConfig,
  SyncPaths,
  DiscoveredSkill,
  DiscoveredAgent,
  DiscoveredCommand,
  DiscoveredMcpServer,
  DiscoveredArtifacts,
  SyncItemResult,
  SyncResult,
  CodexAgentToml,
} from "./types.ts";

describe("types", () => {
  test("SyncConfig shape", () => {
    const config: SyncConfig = {
      modelMapping: { sonnet: "gpt-5.3-codex-spark" },
    };
    expect(config.modelMapping["sonnet"]).toBe("gpt-5.3-codex-spark");
  });

  test("SyncPaths shape", () => {
    const paths: SyncPaths = {
      scope: "user",
      claudeMdSource: "/home/user/.claude/CLAUDE.md",
      pluginScanRoot: "/home/user/.claude/plugins/",
      standaloneSkillsDir: "/home/user/.claude/skills/",
      commandsDir: "/home/user/.claude/commands/",
      standaloneAgentsDir: "/home/user/.claude/agents/",
      mcpConfigSource: "/home/user/.claude.json",
      agentsOverrideDest: "/home/user/.codex/AGENTS.override.md",
      codexSkillsDir: "/home/user/.agents/skills/",
      codexAgentsDir: "/home/user/.codex/agents/",
      codexConfigDir: "/home/user/.codex/",
    };
    expect(paths.claudeMdSource).toContain("CLAUDE.md");
    expect(paths.scope).toBe("user");
  });

  test("DiscoveredSkill shape", () => {
    const skill: DiscoveredSkill = {
      name: "commit",
      sourceDir: "/path/to/skill",
      skillMdPath: "/path/to/skill/SKILL.md",
    };
    expect(skill.name).toBe("commit");
  });

  test("DiscoveredAgent shape", () => {
    const agent: DiscoveredAgent = {
      name: "code-reviewer",
      sourcePath: "/path/to/agent.md",
      source: "plugin",
    };
    expect(agent.source).toBe("plugin");

    const standalone: DiscoveredAgent = {
      name: "helper",
      sourcePath: "/path/to/helper.md",
      source: "standalone",
    };
    expect(standalone.source).toBe("standalone");
  });

  test("DiscoveredMcpServer shape", () => {
    const stdioServer: DiscoveredMcpServer = {
      transport: "stdio",
      id: "my-server",
      command: "npx",
      args: ["-y", "my-server"],
      env: { API_KEY: "secret" },
    };
    expect(stdioServer.id).toBe("my-server");
    expect(stdioServer.transport).toBe("stdio");

    const httpServer: DiscoveredMcpServer = {
      transport: "http",
      id: "remote-server",
      url: "https://example.com/mcp",
      headers: {},
    };
    expect(httpServer.id).toBe("remote-server");
    expect(httpServer.transport).toBe("http");
  });

  test("DiscoveredCommand shape", () => {
    const command: DiscoveredCommand = {
      name: "kiro--spec-init",
      sourcePath: "/path/to/kiro/spec-init.md",
    };
    expect(command.name).toBe("kiro--spec-init");
  });

  test("DiscoveredArtifacts shape", () => {
    const artifacts: DiscoveredArtifacts = {
      skills: [],
      commands: [],
      agents: [],
      mcpServers: [],
      claudeMdExists: false,
    };
    expect(artifacts.claudeMdExists).toBe(false);
  });

  test("SyncItemResult shape with synced status", () => {
    const result: SyncItemResult = {
      artifact: "skill:commit",
      status: "synced",
      destPath: "/path/to/dest",
      warnings: ["Example warning"],
    };
    expect(result.status).toBe("synced");
    expect(result.warnings).toEqual(["Example warning"]);
  });

  test("SyncItemResult shape with failed status", () => {
    const result: SyncItemResult = {
      artifact: "agent:reviewer",
      status: "failed",
      reason: "Frontmatter validation failed",
    };
    expect(result.reason).toBeDefined();
  });

  test("SyncItemResult shape with skipped status", () => {
    const result: SyncItemResult = {
      artifact: "instructions",
      status: "skipped",
      reason: "Source file not found",
    };
    expect(result.status).toBe("skipped");
  });

  test("SyncResult shape", () => {
    const result: SyncResult = {
      items: [
        { artifact: "skill:commit", status: "synced", destPath: "/dest" },
        { artifact: "agent:bad", status: "failed", reason: "invalid" },
      ],
      hasErrors: true,
    };
    expect(result.hasErrors).toBe(true);
    expect(result.items).toHaveLength(2);
  });

  test("CodexAgentToml shape without model", () => {
    const agent: CodexAgentToml = {
      name: "reviewer",
      description: "Reviews code",
      developer_instructions: "You are a code reviewer...",
    };
    expect(agent.model).toBeUndefined();
  });

  test("CodexAgentToml shape with model", () => {
    const agent: CodexAgentToml = {
      name: "reviewer",
      description: "Reviews code",
      developer_instructions: "You are a code reviewer...",
      model: "gpt-5.4",
    };
    expect(agent.model).toBe("gpt-5.4");
  });
});
