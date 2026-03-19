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
import { syncMcpServers } from "./mcp-sync.ts";

describe("syncMcpServers", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mcp-sync-test-"));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  test("converts basic server with command and args to TOML", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    writeFileSync(
      mcpSourcePath,
      JSON.stringify({
        mcpServers: {
          "my-server": {
            command: "node",
            args: ["server.js", "--port", "3000"],
          },
        },
      }),
    );

    const results = syncMcpServers(mcpSourcePath, codexConfigDir);

    expect(results).toHaveLength(1);
    expect(results[0].artifact).toBe("mcp:my-server");
    expect(results[0].status).toBe("synced");

    const toml = readFileSync(join(codexConfigDir, "config.toml"), "utf-8");
    expect(toml).toInclude('[mcp_servers.my-server]');
    expect(toml).toInclude('command = "node"');
    expect(toml).toInclude('"server.js"');
    expect(toml).toInclude('"--port"');
    expect(toml).toInclude('"3000"');
  });

  test("converts server with env vars producing env sub-section in TOML", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    writeFileSync(
      mcpSourcePath,
      JSON.stringify({
        mcpServers: {
          "api-server": {
            command: "python",
            args: ["serve.py"],
            env: {
              API_KEY: "secret-123",
              DEBUG: "true",
            },
          },
        },
      }),
    );

    const results = syncMcpServers(mcpSourcePath, codexConfigDir);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("synced");

    const toml = readFileSync(join(codexConfigDir, "config.toml"), "utf-8");
    expect(toml).toInclude('[mcp_servers.api-server]');
    expect(toml).toInclude('command = "python"');
    expect(toml).toInclude('[mcp_servers.api-server.env]');
    expect(toml).toInclude('API_KEY = "secret-123"');
    expect(toml).toInclude('DEBUG = "true"');
  });

  test("preserves non-MCP sections in existing config.toml", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    mkdirSync(codexConfigDir, { recursive: true });
    writeFileSync(
      join(codexConfigDir, "config.toml"),
      'model = "gpt-5"\napproval_mode = "unless-allow-listed"\n',
    );
    writeFileSync(
      mcpSourcePath,
      JSON.stringify({
        mcpServers: {
          "my-server": { command: "node", args: ["index.js"] },
        },
      }),
    );

    syncMcpServers(mcpSourcePath, codexConfigDir);

    const toml = readFileSync(join(codexConfigDir, "config.toml"), "utf-8");
    expect(toml).toInclude('model = "gpt-5"');
    expect(toml).toInclude('approval_mode = "unless-allow-listed"');
    expect(toml).toInclude('[mcp_servers.my-server]');
  });

  test("overwrites conflicting servers with new values", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    mkdirSync(codexConfigDir, { recursive: true });
    writeFileSync(
      join(codexConfigDir, "config.toml"),
      '[mcp_servers.my-server]\ncommand = "old-cmd"\nargs = ["old-arg"]\n',
    );
    writeFileSync(
      mcpSourcePath,
      JSON.stringify({
        mcpServers: {
          "my-server": { command: "new-cmd", args: ["new-arg"] },
        },
      }),
    );

    syncMcpServers(mcpSourcePath, codexConfigDir);

    const toml = readFileSync(join(codexConfigDir, "config.toml"), "utf-8");
    expect(toml).toInclude('command = "new-cmd"');
    expect(toml).toInclude('"new-arg"');
    expect(toml).not.toInclude("old-cmd");
    expect(toml).not.toInclude("old-arg");
  });

  test("preserves non-conflicting servers in existing config", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    mkdirSync(codexConfigDir, { recursive: true });
    writeFileSync(
      join(codexConfigDir, "config.toml"),
      '[mcp_servers.existing-server]\ncommand = "keep-me"\nargs = ["stay"]\n',
    );
    writeFileSync(
      mcpSourcePath,
      JSON.stringify({
        mcpServers: {
          "new-server": { command: "added", args: ["fresh"] },
        },
      }),
    );

    syncMcpServers(mcpSourcePath, codexConfigDir);

    const toml = readFileSync(join(codexConfigDir, "config.toml"), "utf-8");
    expect(toml).toInclude('[mcp_servers.existing-server]');
    expect(toml).toInclude('command = "keep-me"');
    expect(toml).toInclude('[mcp_servers.new-server]');
    expect(toml).toInclude('command = "added"');
  });

  test("returns empty results when source file does not exist", () => {
    const mcpSourcePath = join(tempDir, "nonexistent.json");
    const codexConfigDir = join(tempDir, "codex-config");

    const results = syncMcpServers(mcpSourcePath, codexConfigDir);

    expect(results).toEqual([]);
    expect(existsSync(join(codexConfigDir, "config.toml"))).toBe(false);
  });

  test("returns empty results when source has no mcpServers key", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    writeFileSync(mcpSourcePath, JSON.stringify({ otherKey: "value" }));

    const results = syncMcpServers(mcpSourcePath, codexConfigDir);

    expect(results).toEqual([]);
    expect(existsSync(join(codexConfigDir, "config.toml"))).toBe(false);
  });

  test("returns failed result when source contains invalid JSON", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    writeFileSync(mcpSourcePath, "not valid json {{{");

    const results = syncMcpServers(mcpSourcePath, codexConfigDir);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].artifact).toBe("mcp");
    expect(results[0].reason).toBeString();
  });

  test("returns failed result when existing config.toml is malformed", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    mkdirSync(codexConfigDir, { recursive: true });
    writeFileSync(join(codexConfigDir, "config.toml"), "not = [valid");
    writeFileSync(
      mcpSourcePath,
      JSON.stringify({
        mcpServers: {
          "my-server": { command: "node" },
        },
      }),
    );

    const results = syncMcpServers(mcpSourcePath, codexConfigDir);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("failed");
    expect(results[0].artifact).toBe("mcp");
    expect(results[0].reason).toContain("Invalid existing TOML");
  });

  test("syncs multiple servers and returns a result for each", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    writeFileSync(
      mcpSourcePath,
      JSON.stringify({
        mcpServers: {
          "server-a": { command: "cmd-a" },
          "server-b": { command: "cmd-b", args: ["arg-b"] },
        },
      }),
    );

    const results = syncMcpServers(mcpSourcePath, codexConfigDir);

    expect(results).toHaveLength(2);
    expect(results.map((r) => r.artifact).sort()).toEqual([
      "mcp:server-a",
      "mcp:server-b",
    ]);
    expect(results.every((r) => r.status === "synced")).toBe(true);

    const toml = readFileSync(join(codexConfigDir, "config.toml"), "utf-8");
    expect(toml).toInclude('[mcp_servers.server-a]');
    expect(toml).toInclude('[mcp_servers.server-b]');
  });

  test("omits empty env from TOML output", () => {
    const mcpSourcePath = join(tempDir, "mcp.json");
    const codexConfigDir = join(tempDir, "codex-config");
    writeFileSync(
      mcpSourcePath,
      JSON.stringify({
        mcpServers: {
          "no-env-server": { command: "run", args: [], env: {} },
        },
      }),
    );

    const results = syncMcpServers(mcpSourcePath, codexConfigDir);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("synced");

    const toml = readFileSync(join(codexConfigDir, "config.toml"), "utf-8");
    expect(toml).toInclude('[mcp_servers.no-env-server]');
    expect(toml).not.toInclude("[mcp_servers.no-env-server.env]");
  });
});
