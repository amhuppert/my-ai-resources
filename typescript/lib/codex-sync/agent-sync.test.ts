import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  mkdtempSync,
  writeFileSync,
  existsSync,
  rmSync,
  readFileSync,
  mkdirSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { parse as parseToml } from "smol-toml";
import { convertAgentToToml, syncAgents } from "./agent-sync.ts";
import type { DiscoveredAgent } from "./types.ts";

function agentMd(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const lines = Object.entries(frontmatter).map(([k, v]) => {
    if (typeof v === "object") return `${k}: ${JSON.stringify(v)}`;
    return `${k}: ${v}`;
  });
  return `---\n${lines.join("\n")}\n---\n${body}`;
}

describe("convertAgentToToml", () => {
  test("converts agent with mapped model", () => {
    const content = agentMd(
      { name: "code-reviewer", description: "Reviews code", model: "opus" },
      "# Instructions\nReview code carefully.",
    );
    const mapping = { opus: "gpt-5.4", sonnet: "gpt-5.3-codex-spark" };

    const result = convertAgentToToml(content, mapping);

    expect(result.warnings).toHaveLength(0);
    const parsed = parseToml(result.toml);
    expect(parsed.name).toBe("code-reviewer");
    expect(parsed.description).toBe("Reviews code");
    expect(parsed.model).toBe("gpt-5.4");
    expect(parsed.developer_instructions).toBe(
      "# Instructions\nReview code carefully.",
    );
  });

  test("warns and omits model when no mapping exists", () => {
    const content = agentMd(
      {
        name: "helper",
        description: "Helps with tasks",
        model: "unknown-model",
      },
      "Do helpful things.",
    );
    const mapping = { opus: "gpt-5.4" };

    const result = convertAgentToToml(content, mapping);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toInclude("unknown-model");
    const parsed = parseToml(result.toml);
    expect(parsed.name).toBe("helper");
    expect(parsed.description).toBe("Helps with tasks");
    expect(parsed.model).toBeUndefined();
    expect(parsed.developer_instructions).toBe("Do helpful things.");
  });

  test("silently omits model 'inherit' without warning", () => {
    const content = agentMd(
      {
        name: "sub-agent",
        description: "A sub-agent",
        model: "inherit",
      },
      "Sub-agent instructions.",
    );
    const mapping = { opus: "gpt-5.4" };

    const result = convertAgentToToml(content, mapping);

    expect(result.warnings).toHaveLength(0);
    const parsed = parseToml(result.toml);
    expect(parsed.name).toBe("sub-agent");
    expect(parsed.model).toBeUndefined();
  });

  test("no model field produces no model in output and no warning", () => {
    const content = agentMd(
      { name: "simple-agent", description: "A simple agent" },
      "Just do things.",
    );

    const result = convertAgentToToml(content, { opus: "gpt-5.4" });

    expect(result.warnings).toHaveLength(0);
    const parsed = parseToml(result.toml);
    expect(parsed.name).toBe("simple-agent");
    expect(parsed.description).toBe("A simple agent");
    expect(parsed.model).toBeUndefined();
  });

  test("strips extra frontmatter fields like color and tools", () => {
    const content = [
      "---",
      "name: fancy-agent",
      "description: Agent with extras",
      "model: opus",
      "color: blue",
      "tools:",
      "  - Read",
      "  - Write",
      "  - Bash",
      "---",
      "Do fancy things.",
    ].join("\n");
    const mapping = { opus: "gpt-5.4" };

    const result = convertAgentToToml(content, mapping);

    expect(result.warnings).toHaveLength(0);
    const parsed = parseToml(result.toml);
    expect(parsed.name).toBe("fancy-agent");
    expect(parsed.description).toBe("Agent with extras");
    expect(parsed.model).toBe("gpt-5.4");
    expect(parsed.color).toBeUndefined();
    expect(parsed.tools).toBeUndefined();
    expect(parsed.developer_instructions).toBe("Do fancy things.");
  });

  test("throws on invalid frontmatter missing required name", () => {
    const content = agentMd(
      { description: "No name here" },
      "Body content.",
    );

    expect(() => convertAgentToToml(content, {})).toThrow();
  });
});

describe("syncAgents", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "agent-sync-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("writes .toml files per agent to dest dir", () => {
    const agentDir = join(tempDir, "agents");
    mkdirSync(agentDir, { recursive: true });

    const agent1Path = join(agentDir, "reviewer.md");
    writeFileSync(
      agent1Path,
      agentMd(
        { name: "reviewer", description: "Reviews code", model: "opus" },
        "Review all code.",
      ),
    );

    const agent2Path = join(agentDir, "helper.md");
    writeFileSync(
      agent2Path,
      agentMd(
        { name: "helper", description: "Helps out" },
        "Help with tasks.",
      ),
    );

    const destDir = join(tempDir, "codex-agents");
    const agents: DiscoveredAgent[] = [
      { name: "reviewer", sourcePath: agent1Path, source: "plugin" },
      { name: "helper", sourcePath: agent2Path, source: "standalone" },
    ];
    const mapping = { opus: "gpt-5.4" };

    const results = syncAgents(agents, destDir, mapping);

    expect(results).toHaveLength(2);
    expect(results.every((r) => r.status === "synced")).toBe(true);

    const reviewer = parseToml(
      readFileSync(join(destDir, "reviewer.toml"), "utf-8"),
    );
    expect(reviewer.name).toBe("reviewer");
    expect(reviewer.model).toBe("gpt-5.4");

    const helper = parseToml(
      readFileSync(join(destDir, "helper.toml"), "utf-8"),
    );
    expect(helper.name).toBe("helper");
    expect(helper.model).toBeUndefined();
    expect(results.every((result) => result.warnings === undefined)).toBe(true);
  });

  test("returns synced result with warnings when model mapping is missing", () => {
    const agentPath = join(tempDir, "helper.md");
    writeFileSync(
      agentPath,
      agentMd(
        {
          name: "helper",
          description: "Helps with tasks",
          model: "unknown-model",
        },
        "Do helpful things.",
      ),
    );

    const results = syncAgents(
      [{ name: "helper", sourcePath: agentPath, source: "plugin" }],
      join(tempDir, "dest"),
      {},
    );

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("synced");
    expect(results[0].warnings).toHaveLength(1);
    expect(results[0].warnings?.[0]).toInclude("unknown-model");
  });

  test("overwrites existing agent with matching name", () => {
    const destDir = join(tempDir, "codex-agents");
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, "reviewer.toml"), 'name = "old-reviewer"\n');

    const agentPath = join(tempDir, "reviewer.md");
    writeFileSync(
      agentPath,
      agentMd(
        { name: "reviewer", description: "Updated reviewer" },
        "Updated instructions.",
      ),
    );

    const agents: DiscoveredAgent[] = [
      { name: "reviewer", sourcePath: agentPath, source: "plugin" },
    ];

    const results = syncAgents(agents, destDir, {});

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("synced");

    const parsed = parseToml(
      readFileSync(join(destDir, "reviewer.toml"), "utf-8"),
    );
    expect(parsed.name).toBe("reviewer");
    expect(parsed.description).toBe("Updated reviewer");
  });

  test("preserves non-conflicting existing agents in dest dir", () => {
    const destDir = join(tempDir, "codex-agents");
    mkdirSync(destDir, { recursive: true });
    writeFileSync(
      join(destDir, "existing-agent.toml"),
      'name = "existing-agent"\ndescription = "Should stay"\n',
    );

    const agentPath = join(tempDir, "new-agent.md");
    writeFileSync(
      agentPath,
      agentMd(
        { name: "new-agent", description: "Brand new" },
        "New instructions.",
      ),
    );

    const agents: DiscoveredAgent[] = [
      { name: "new-agent", sourcePath: agentPath, source: "standalone" },
    ];

    syncAgents(agents, destDir, {});

    expect(existsSync(join(destDir, "existing-agent.toml"))).toBe(true);
    const existing = readFileSync(
      join(destDir, "existing-agent.toml"),
      "utf-8",
    );
    expect(existing).toInclude("existing-agent");

    expect(existsSync(join(destDir, "new-agent.toml"))).toBe(true);
  });

  test("returns failed result when frontmatter validation fails", () => {
    const agentPath = join(tempDir, "bad-agent.md");
    writeFileSync(
      agentPath,
      agentMd({ description: "Missing name field" }, "Body."),
    );

    const agents: DiscoveredAgent[] = [
      { name: "bad-agent", sourcePath: agentPath, source: "plugin" },
    ];

    const results = syncAgents(agents, join(tempDir, "dest"), {});

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].artifact).toBe("agent:bad-agent");
    expect(results[0].reason).toBeString();
  });
});
