import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import {
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import matter from "gray-matter";
import { parse as tomlParse } from "smol-toml";
import { runCodexSync } from "./codex-sync-cli.ts";

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "codex-sync-integ-"));
}

function setupMockClaudeCodeStructure(rootDir: string) {
  // CLAUDE.md
  writeFileSync(join(rootDir, "CLAUDE.md"), "# Project Instructions\n\nDo good work.");

  // Plugin with skills and agents
  const pluginDir = join(rootDir, "my-plugin");
  mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
  writeFileSync(
    join(pluginDir, ".claude-plugin", "plugin.json"),
    JSON.stringify({ name: "my-plugin" }),
  );

  // Skill with frontmatter including fields to strip
  const skillDir = join(pluginDir, "skills", "commit");
  mkdirSync(skillDir, { recursive: true });
  writeFileSync(
    join(skillDir, "SKILL.md"),
    matter.stringify("Commit skill body content", {
      name: "commit",
      description: "AI-aware git commits",
      "allowed-tools": ["Bash", "Read"],
      "argument-hint": "optional message",
    }),
  );

  // Supporting file in skill directory
  const scriptsDir = join(skillDir, "scripts");
  mkdirSync(scriptsDir, { recursive: true });
  writeFileSync(join(scriptsDir, "helper.ts"), "export const x = 1;");

  // Plugin agent
  const agentsDir = join(pluginDir, "agents");
  mkdirSync(agentsDir, { recursive: true });
  writeFileSync(
    join(agentsDir, "code-reviewer.md"),
    matter.stringify("You are a code reviewer.\n\nReview thoroughly.", {
      name: "code-reviewer",
      description: "Reviews code changes",
      model: "sonnet",
      color: "#ff0000",
      tools: ["Read", "Grep"],
    }),
  );

  // Standalone agents directory
  const standaloneAgentsDir = join(rootDir, ".claude", "agents");
  mkdirSync(standaloneAgentsDir, { recursive: true });
  writeFileSync(
    join(standaloneAgentsDir, "architect.md"),
    matter.stringify("You are a software architect.", {
      name: "architect",
      description: "Designs software architecture",
      model: "opus",
    }),
  );

  // Standalone skill (not in any plugin)
  const standaloneSkillDir = join(rootDir, ".claude", "skills", "example-sync-skill");
  mkdirSync(standaloneSkillDir, { recursive: true });
  writeFileSync(
    join(standaloneSkillDir, "SKILL.md"),
    matter.stringify("Synchronizes example rules.", {
      name: "example-sync-skill",
      description: "Sync example rules to CLAUDE.md",
    }),
  );

  // Commands
  const commandsDir = join(rootDir, ".claude", "commands");
  mkdirSync(commandsDir, { recursive: true });
  writeFileSync(
    join(commandsDir, "audit-standards.md"),
    matter.stringify("# Audit Standards\n\nPerform audit.", {
      name: "audit-standards",
      description: "Audit code standards",
      "allowed-tools": ["Read", "Grep"],
      "required-context": "Project code standards",
    }),
  );
  const kiroDir = join(commandsDir, "kiro");
  mkdirSync(kiroDir, { recursive: true });
  writeFileSync(
    join(kiroDir, "spec-init.md"),
    matter.stringify("# Spec Init\n\nInitialize a spec.", {
      description: "Initialize a new specification",
      "allowed-tools": "Bash, Read, Write",
      "argument-hint": "<project-description>",
    }),
  );

  // MCP config
  writeFileSync(
    join(rootDir, ".mcp.json"),
    JSON.stringify({
      mcpServers: {
        "example-mcp": {
          command: "example-mcp",
          args: ["--stdio"],
          env: { API_KEY: "test-key" },
        },
        "memory-bank": {
          command: "memory-bank-mcp",
          args: [],
        },
      },
    }),
  );
}

describe("codex-sync end-to-end integration", () => {
  let tempDir: string;
  let configPath: string;

  beforeEach(() => {
    tempDir = createTempDir();
    configPath = join(tempDir, "config", "codex-sync.json");
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("full sync creates all Codex output files with expected content", () => {
    const projectDir = join(tempDir, "project");
    mkdirSync(projectDir, { recursive: true });
    setupMockClaudeCodeStructure(projectDir);

    const exitCode = runCodexSync({
      scope: "project",
      cwd: projectDir,
      configPath,
    });

    expect(exitCode).toBe(0);

    // Verify AGENTS.override.md
    const overridePath = join(projectDir, "AGENTS.override.md");
    expect(existsSync(overridePath)).toBe(true);
    const overrideContent = readFileSync(overridePath, "utf-8");
    expect(overrideContent).toContain("# Project Instructions");
    expect(overrideContent).toContain("Do good work.");

    // Verify skill directory was copied
    const skillDest = join(projectDir, ".agents", "skills", "commit");
    expect(existsSync(skillDest)).toBe(true);
    expect(existsSync(join(skillDest, "scripts", "helper.ts"))).toBe(true);

    // Verify SKILL.md frontmatter was adapted (stripped fields)
    const skillContent = readFileSync(join(skillDest, "SKILL.md"), "utf-8");
    const { data: skillData } = matter(skillContent);
    expect(skillData["name"]).toBe("commit");
    expect(skillData["description"]).toBe("AI-aware git commits");
    expect(skillData["allowed-tools"]).toBeUndefined();
    expect(skillData["argument-hint"]).toBeUndefined();

    // Verify agent TOML files
    const codeReviewerToml = join(projectDir, ".codex", "agents", "code-reviewer.toml");
    expect(existsSync(codeReviewerToml)).toBe(true);
    const reviewerTomlContent = tomlParse(readFileSync(codeReviewerToml, "utf-8"));
    expect(reviewerTomlContent["name"]).toBe("code-reviewer");
    expect(reviewerTomlContent["description"]).toBe("Reviews code changes");
    expect(reviewerTomlContent["model"]).toBe("gpt-5.4");
    expect(typeof reviewerTomlContent["developer_instructions"]).toBe("string");
    expect((reviewerTomlContent["developer_instructions"] as string)).toContain("code reviewer");
    // color and tools should NOT appear in TOML
    expect(reviewerTomlContent["color"]).toBeUndefined();
    expect(reviewerTomlContent["tools"]).toBeUndefined();

    const architectToml = join(projectDir, ".codex", "agents", "architect.toml");
    expect(existsSync(architectToml)).toBe(true);
    const architectTomlContent = tomlParse(readFileSync(architectToml, "utf-8"));
    expect(architectTomlContent["name"]).toBe("architect");
    expect(architectTomlContent["model"]).toBe("gpt-5.4");

    // Verify standalone skill was synced
    const standaloneSkillDest = join(projectDir, ".agents", "skills", "example-sync-skill");
    expect(existsSync(standaloneSkillDest)).toBe(true);
    const standaloneSkillContent = readFileSync(join(standaloneSkillDest, "SKILL.md"), "utf-8");
    const { data: standaloneSkillData } = matter(standaloneSkillContent);
    expect(standaloneSkillData["name"]).toBe("example-sync-skill");
    expect(standaloneSkillData["description"]).toBe("Sync example rules to CLAUDE.md");

    // Verify top-level command was converted to skill
    const auditSkillDest = join(projectDir, ".agents", "skills", "audit-standards");
    expect(existsSync(auditSkillDest)).toBe(true);
    const auditSkillContent = readFileSync(join(auditSkillDest, "SKILL.md"), "utf-8");
    const { data: auditData } = matter(auditSkillContent);
    expect(auditData["name"]).toBe("audit-standards");
    expect(auditData["description"]).toBe("Audit code standards");
    expect(auditData["allowed-tools"]).toBeUndefined();
    expect(auditData["required-context"]).toBeUndefined();

    // Verify namespaced command was converted to skill with -- separator
    const specInitSkillDest = join(projectDir, ".agents", "skills", "kiro--spec-init");
    expect(existsSync(specInitSkillDest)).toBe(true);
    const specInitContent = readFileSync(join(specInitSkillDest, "SKILL.md"), "utf-8");
    const { data: specInitData } = matter(specInitContent);
    expect(specInitData["name"]).toBe("kiro--spec-init");
    expect(specInitData["description"]).toBe("Initialize a new specification");
    expect(specInitData["allowed-tools"]).toBeUndefined();
    expect(specInitData["argument-hint"]).toBeUndefined();

    // Verify MCP config.toml
    const configTomlPath = join(projectDir, ".codex", "config.toml");
    expect(existsSync(configTomlPath)).toBe(true);
    const configToml = tomlParse(readFileSync(configTomlPath, "utf-8"));
    const mcpServers = configToml["mcp_servers"] as Record<string, Record<string, unknown>>;
    expect(mcpServers).toBeDefined();
    expect(mcpServers["example-mcp"]).toBeDefined();
    expect(mcpServers["example-mcp"]["command"]).toBe("example-mcp");
    expect(mcpServers["example-mcp"]["args"]).toEqual(["--stdio"]);
    expect((mcpServers["example-mcp"]["env"] as Record<string, string>)["API_KEY"]).toBe("test-key");
    expect(mcpServers["memory-bank"]).toBeDefined();
    expect(mcpServers["memory-bank"]["command"]).toBe("memory-bank-mcp");

    // Verify default config was created
    expect(existsSync(configPath)).toBe(true);
  });

  test("returns non-zero exit code when sync has errors", () => {
    const projectDir = join(tempDir, "project");
    mkdirSync(projectDir, { recursive: true });

    // Plugin with skill that has invalid frontmatter (missing description)
    const pluginDir = join(projectDir, "bad-plugin");
    mkdirSync(join(pluginDir, ".claude-plugin"), { recursive: true });
    writeFileSync(
      join(pluginDir, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "bad-plugin" }),
    );
    const skillDir = join(pluginDir, "skills", "broken-skill");
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(
      join(skillDir, "SKILL.md"),
      matter.stringify("Body", { name: "broken-skill" }),
    );

    const exitCode = runCodexSync({
      scope: "project",
      cwd: projectDir,
      configPath,
    });

    expect(exitCode).toBe(1);
  });

  test("overwrite/preserve: conflicting items overwritten, non-conflicting preserved", () => {
    const projectDir = join(tempDir, "project");
    mkdirSync(projectDir, { recursive: true });
    setupMockClaudeCodeStructure(projectDir);

    // Pre-populate Codex directories with conflicting and non-conflicting items

    // Non-conflicting skill (should be preserved)
    const existingSkillDir = join(projectDir, ".agents", "skills", "custom-skill");
    mkdirSync(existingSkillDir, { recursive: true });
    writeFileSync(join(existingSkillDir, "SKILL.md"), "# Custom skill");

    // Conflicting skill (should be overwritten)
    const conflictSkillDir = join(projectDir, ".agents", "skills", "commit");
    mkdirSync(conflictSkillDir, { recursive: true });
    writeFileSync(join(conflictSkillDir, "SKILL.md"), "# Old commit skill");

    // Non-conflicting agent (should be preserved)
    const existingAgentDir = join(projectDir, ".codex", "agents");
    mkdirSync(existingAgentDir, { recursive: true });
    writeFileSync(join(existingAgentDir, "custom-agent.toml"), 'name = "custom-agent"');

    // Conflicting agent (should be overwritten)
    writeFileSync(join(existingAgentDir, "code-reviewer.toml"), 'name = "old-reviewer"');

    // Non-conflicting MCP server in existing config.toml
    const codexConfigDir = join(projectDir, ".codex");
    mkdirSync(codexConfigDir, { recursive: true });
    writeFileSync(
      join(codexConfigDir, "config.toml"),
      '[model]\nname = "gpt-5.4"\n\n[mcp_servers.existing-server]\ncommand = "keep-me"\n',
    );

    const exitCode = runCodexSync({
      scope: "project",
      cwd: projectDir,
      configPath,
    });

    expect(exitCode).toBe(0);

    // Non-conflicting skill preserved
    expect(existsSync(join(projectDir, ".agents", "skills", "custom-skill", "SKILL.md"))).toBe(true);
    expect(readFileSync(join(projectDir, ".agents", "skills", "custom-skill", "SKILL.md"), "utf-8")).toBe(
      "# Custom skill",
    );

    // Conflicting skill overwritten
    const commitSkillContent = readFileSync(
      join(projectDir, ".agents", "skills", "commit", "SKILL.md"),
      "utf-8",
    );
    expect(commitSkillContent).not.toBe("# Old commit skill");
    expect(commitSkillContent).toContain("Commit skill body content");

    // Non-conflicting agent preserved
    expect(existsSync(join(projectDir, ".codex", "agents", "custom-agent.toml"))).toBe(true);
    expect(readFileSync(join(projectDir, ".codex", "agents", "custom-agent.toml"), "utf-8")).toBe(
      'name = "custom-agent"',
    );

    // Conflicting agent overwritten
    const reviewerContent = readFileSync(
      join(projectDir, ".codex", "agents", "code-reviewer.toml"),
      "utf-8",
    );
    expect(reviewerContent).not.toContain("old-reviewer");
    const reviewerToml = tomlParse(reviewerContent);
    expect(reviewerToml["name"]).toBe("code-reviewer");

    // Non-conflicting MCP server preserved
    const configToml = tomlParse(
      readFileSync(join(projectDir, ".codex", "config.toml"), "utf-8"),
    );
    expect((configToml["model"] as Record<string, string>)["name"]).toBe("gpt-5.4");
    const mcpServers = configToml["mcp_servers"] as Record<string, Record<string, unknown>>;
    expect(mcpServers["existing-server"]).toBeDefined();
    expect(mcpServers["existing-server"]["command"]).toBe("keep-me");

    // Synced MCP servers present
    expect(mcpServers["example-mcp"]).toBeDefined();
    expect(mcpServers["memory-bank"]).toBeDefined();
  });

  test("creates default config file when it does not exist", () => {
    const projectDir = join(tempDir, "project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "CLAUDE.md"), "# Instructions");

    expect(existsSync(configPath)).toBe(false);

    runCodexSync({
      scope: "project",
      cwd: projectDir,
      configPath,
    });

    expect(existsSync(configPath)).toBe(true);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.modelMapping).toBeDefined();
    expect(typeof config.modelMapping.sonnet).toBe("string");
  });

  test("returns non-zero exit code instead of throwing on malformed existing config.toml", () => {
    const projectDir = join(tempDir, "project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "CLAUDE.md"), "# Instructions");
    writeFileSync(
      join(projectDir, ".mcp.json"),
      JSON.stringify({
        mcpServers: {
          "test-server": { command: "node" },
        },
      }),
    );
    mkdirSync(join(projectDir, ".codex"), { recursive: true });
    writeFileSync(join(projectDir, ".codex", "config.toml"), "not = [valid");

    const exitCode = runCodexSync({
      scope: "project",
      cwd: projectDir,
      configPath,
    });

    expect(exitCode).toBe(1);
  });

  test("exits with error for invalid sync config", () => {
    const projectDir = join(tempDir, "project");
    mkdirSync(projectDir, { recursive: true });
    writeFileSync(join(projectDir, "CLAUDE.md"), "# Instructions");

    // Create invalid config
    mkdirSync(join(tempDir, "config"), { recursive: true });
    writeFileSync(configPath, JSON.stringify({ modelMapping: "not-an-object" }));

    const exitCode = runCodexSync({
      scope: "project",
      cwd: projectDir,
      configPath,
    });

    expect(exitCode).toBe(1);
  });
});
