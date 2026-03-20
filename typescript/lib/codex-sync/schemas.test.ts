import { describe, expect, test } from "bun:test";
import {
  SyncConfigSchema,
  SkillFrontmatterSchema,
  AgentFrontmatterSchema,
  StdioMcpServerSchema,
  HttpMcpServerSchema,
  McpConfigSchema,
  DEFAULT_SYNC_CONFIG,
} from "./schemas.ts";

describe("SyncConfigSchema", () => {
  test("validates a valid config with modelMapping", () => {
    const input = {
      modelMapping: {
        sonnet: "gpt-5.3-codex-spark",
        opus: "gpt-5.4",
      },
    };
    const result = SyncConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.modelMapping).toEqual(input.modelMapping);
    }
  });

  test("rejects config missing modelMapping", () => {
    const result = SyncConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test("uses .passthrough() to preserve unknown properties", () => {
    const input = {
      modelMapping: { sonnet: "gpt-5.3-codex-spark" },
      futureField: "some-value",
    };
    const result = SyncConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)["futureField"]).toBe(
        "some-value",
      );
    }
  });
});

describe("DEFAULT_SYNC_CONFIG", () => {
  test("has model mappings for sonnet, opus, and haiku", () => {
    expect(DEFAULT_SYNC_CONFIG.modelMapping).toHaveProperty("sonnet");
    expect(DEFAULT_SYNC_CONFIG.modelMapping).toHaveProperty("opus");
    expect(DEFAULT_SYNC_CONFIG.modelMapping).toHaveProperty("haiku");
  });

  test("validates against SyncConfigSchema", () => {
    const result = SyncConfigSchema.safeParse(DEFAULT_SYNC_CONFIG);
    expect(result.success).toBe(true);
  });
});

describe("SkillFrontmatterSchema", () => {
  test("validates with name and description", () => {
    const input = { name: "commit", description: "Git commit helper" };
    const result = SkillFrontmatterSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("commit");
      expect(result.data.description).toBe("Git commit helper");
    }
  });

  test("rejects missing name", () => {
    const result = SkillFrontmatterSchema.safeParse({
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing description", () => {
    const result = SkillFrontmatterSchema.safeParse({ name: "test" });
    expect(result.success).toBe(false);
  });

  test("passes through unknown properties", () => {
    const input = {
      name: "commit",
      description: "desc",
      "allowed-tools": ["Bash"],
      "argument-hint": "message",
    };
    const result = SkillFrontmatterSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(
        (result.data as Record<string, unknown>)["allowed-tools"],
      ).toEqual(["Bash"]);
    }
  });
});

describe("AgentFrontmatterSchema", () => {
  test("validates with name and description", () => {
    const input = { name: "reviewer", description: "Code reviewer" };
    const result = AgentFrontmatterSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("validates with optional model", () => {
    const input = {
      name: "reviewer",
      description: "Code reviewer",
      model: "sonnet",
    };
    const result = AgentFrontmatterSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBe("sonnet");
    }
  });

  test("validates without model field", () => {
    const input = { name: "reviewer", description: "Code reviewer" };
    const result = AgentFrontmatterSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.model).toBeUndefined();
    }
  });

  test("passes through unexpected fields like color and tools", () => {
    const input = {
      name: "reviewer",
      description: "Code reviewer",
      color: "#ff0000",
      tools: ["Read", "Write"],
    };
    const result = AgentFrontmatterSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)["color"]).toBe(
        "#ff0000",
      );
      expect((result.data as Record<string, unknown>)["tools"]).toEqual([
        "Read",
        "Write",
      ]);
    }
  });

  test("rejects missing name", () => {
    const result = AgentFrontmatterSchema.safeParse({
      description: "test",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing description", () => {
    const result = AgentFrontmatterSchema.safeParse({ name: "test" });
    expect(result.success).toBe(false);
  });
});

describe("StdioMcpServerSchema", () => {
  test("validates minimal entry with command only", () => {
    const input = { command: "npx" };
    const result = StdioMcpServerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.command).toBe("npx");
      expect(result.data.args).toBeUndefined();
      expect(result.data.env).toBeUndefined();
    }
  });

  test("validates full entry with command, args, and env", () => {
    const input = {
      command: "node",
      args: ["server.js", "--port", "3000"],
      env: { API_KEY: "secret" },
    };
    const result = StdioMcpServerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.args).toEqual(["server.js", "--port", "3000"]);
      expect(result.data.env).toEqual({ API_KEY: "secret" });
    }
  });

  test("rejects missing command", () => {
    const result = StdioMcpServerSchema.safeParse({ args: ["--help"] });
    expect(result.success).toBe(false);
  });

  test("passes through unknown properties", () => {
    const input = { command: "npx", timeout: 5000 };
    const result = StdioMcpServerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)["timeout"]).toBe(5000);
    }
  });
});

describe("HttpMcpServerSchema", () => {
  test("validates entry with url only", () => {
    const input = { url: "https://mcp.example.com/mcp" };
    const result = HttpMcpServerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe("https://mcp.example.com/mcp");
    }
  });

  test("validates entry with url and type", () => {
    const input = { type: "http", url: "https://mcp.example.com/mcp" };
    const result = HttpMcpServerSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("validates entry with url and headers", () => {
    const input = {
      url: "https://mcp.example.com/mcp",
      headers: { Authorization: "Bearer token123" },
    };
    const result = HttpMcpServerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.headers).toEqual({ Authorization: "Bearer token123" });
    }
  });

  test("rejects entry without url", () => {
    const result = HttpMcpServerSchema.safeParse({ type: "http" });
    expect(result.success).toBe(false);
  });

  test("passes through unknown properties", () => {
    const input = { url: "https://example.com", oauth: { clientId: "abc" } };
    const result = HttpMcpServerSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)["oauth"]).toEqual({ clientId: "abc" });
    }
  });
});

describe("McpConfigSchema", () => {
  test("validates with stdio mcpServers", () => {
    const input = {
      mcpServers: {
        "my-server": { command: "npx", args: ["-y", "my-server"] },
      },
    };
    const result = McpConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("validates with http mcpServers", () => {
    const input = {
      mcpServers: {
        "remote-server": { type: "http", url: "https://example.com/mcp" },
      },
    };
    const result = McpConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("validates with mixed stdio and http mcpServers", () => {
    const input = {
      mcpServers: {
        "local-server": { command: "npx", args: ["-y", "my-server"] },
        "remote-server": { url: "https://example.com/mcp" },
      },
    };
    const result = McpConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  test("validates without mcpServers (empty config)", () => {
    const result = McpConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.mcpServers).toBeUndefined();
    }
  });

  test("passes through unknown properties", () => {
    const input = {
      mcpServers: { server: { command: "npx" } },
      permissions: { allow: true },
    };
    const result = McpConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as Record<string, unknown>)["permissions"]).toEqual({
        allow: true,
      });
    }
  });
});
