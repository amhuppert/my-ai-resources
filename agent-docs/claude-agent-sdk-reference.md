# Claude Agent SDK (TypeScript) Reference Guide for AI Agents

<Overview>
The Anthropic Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) provides a TypeScript API for building autonomous AI agents powered by Claude. It wraps the Claude Code CLI as a subprocess, giving agents access to Claude Code's full toolset (file I/O, bash, web search, MCP servers, subagents) via a streaming async generator interface. Authentication is automatic — it reuses the host machine's Claude Code credentials.
</Overview>

## Installation & Setup

```bash
npm install @anthropic-ai/claude-agent-sdk zod@^4
```

- **Node.js 18+** required
- **Zod 4** is a peer dependency (not Zod 3 — the SDK will fail to install with `zod@^3`)
- The SDK spawns `claude` CLI as a subprocess — Claude Code must be installed and authenticated on the machine

### Authentication

The SDK inherits authentication from the Claude Code CLI. No API key is needed if Claude Code is already logged in.

| Auth Method | How It Works |
|---|---|
| **Claude Max/Pro subscription** | OAuth credentials in `~/.claude/.credentials.json` — automatic |
| **API key** | Set `ANTHROPIC_API_KEY` environment variable |
| **Amazon Bedrock** | Set `CLAUDE_CODE_USE_BEDROCK=1` + AWS credentials |
| **Google Vertex AI** | Set `CLAUDE_CODE_USE_VERTEX=1` + GCP credentials |

<critical>
**Nested session guard**: If running from inside a Claude Code terminal session, the subprocess will refuse to start with "cannot be launched inside another Claude Code session." Fix by unsetting the env var:

```bash
CLAUDECODE= node my-agent.js
# or in code:
delete process.env.CLAUDECODE;
```
</critical>

## Core API

### `query()` — Run an Agent

The primary entry point. Returns an async generator that streams messages as the agent works.

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = query({
  prompt: "Find bugs in src/auth.ts and fix them",
  options: {
    model: "claude-sonnet-4-6",
    maxTurns: 10,
    allowedTools: ["Read", "Edit", "Grep", "Glob"],
    permissionMode: "acceptEdits",
    cwd: "/path/to/project",
  },
});

for await (const message of result) {
  if (message.type === "assistant") {
    for (const block of message.message.content) {
      if (block.type === "text") console.log(block.text);
    }
  }
  if (message.type === "result") {
    console.log(`Done. Cost: $${message.total_cost_usd}`);
  }
}
```

**Signature:**

```typescript
function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;
```

### `Query` Object

Extends `AsyncGenerator<SDKMessage, void>` with control methods:

| Method | Description |
|---|---|
| `interrupt()` | Stop the agent mid-execution |
| `setPermissionMode(mode)` | Change permission mode at runtime |
| `setModel(model?)` | Switch model at runtime |
| `setMaxThinkingTokens(n)` | Adjust thinking budget |
| `supportedModels()` | List available models |
| `supportedCommands()` | List available slash commands/skills |
| `mcpServerStatus()` | Check MCP server connection status |
| `accountInfo()` | Get account details (email, subscription type) |
| `rewindFiles(messageUuid)` | Restore files to state at a previous message |
| `reconnectMcpServer(name)` | Reconnect a failed MCP server |
| `toggleMcpServer(name, enabled)` | Enable/disable an MCP server |
| `setMcpServers(servers)` | Replace all MCP server configurations |
| `stopTask(taskId)` | Stop a running subagent task |
| `close()` | Terminate the query |

## Options Reference

```typescript
type Options = {
  // --- Model & Execution ---
  model?: string;                    // e.g. "claude-sonnet-4-6", "claude-opus-4-6"
  fallbackModel?: string;            // Fallback if primary model fails
  maxTurns?: number;                 // Max agentic turns before stopping
  maxBudgetUsd?: number;             // Cost ceiling in USD
  cwd?: string;                      // Working directory for the agent
  env?: Record<string, string>;      // Environment variables

  // --- Permissions ---
  permissionMode?: PermissionMode;
  allowedTools?: string[];           // Allowlist of tool names
  disallowedTools?: string[];        // Denylist of tool names
  canUseTool?: CanUseTool;           // Custom permission callback
  allowDangerouslySkipPermissions?: boolean; // Required for "bypassPermissions" mode

  // --- System Prompt ---
  systemPrompt?: string | {
    type: "preset";
    preset: "claude_code";
    append?: string;                 // Extra instructions appended to CC prompt
  };

  // --- Tools ---
  tools?: string[] | { type: "preset"; preset: "claude_code" };

  // --- MCP Servers ---
  mcpServers?: Record<string, McpServerConfig>;
  strictMcpConfig?: boolean;         // Fail on MCP server errors

  // --- Subagents ---
  agents?: Record<string, AgentDefinition>;

  // --- Thinking ---
  thinking?: ThinkingConfig;
  maxThinkingTokens?: number;        // Deprecated: use thinking instead
  effort?: "low" | "medium" | "high" | "max";

  // --- Sessions ---
  resume?: string;                   // Session ID to resume
  resumeSessionAt?: string;          // Resume at specific message UUID
  continue?: boolean;                // Continue previous conversation
  forkSession?: boolean;             // Fork instead of continuing
  persistSession?: boolean;          // Default: true

  // --- Output ---
  outputFormat?: { type: "json_schema"; schema: JSONSchema };
  includePartialMessages?: boolean;  // Stream partial assistant messages

  // --- Sandbox ---
  sandbox?: SandboxSettings;

  // --- Hooks ---
  hooks?: Partial<Record<HookEvent, HookCallbackMatcher[]>>;

  // --- Settings ---
  settingSources?: SettingSource[];  // "user" | "project" | "local"

  // --- Plugins ---
  plugins?: SdkPluginConfig[];       // { type: "local"; path: string }

  // --- Betas ---
  betas?: SdkBeta[];                 // e.g. "context-1m-2025-08-07"

  // --- Process ---
  executable?: "bun" | "deno" | "node";
  pathToClaudeCodeExecutable?: string;
  additionalDirectories?: string[];
  enableFileCheckpointing?: boolean;

  // --- Debug ---
  debug?: boolean;
  debugFile?: string;
  stderr?: (data: string) => void;
};
```

<critical>
**Settings are NOT auto-loaded.** By default, `CLAUDE.md` and project settings are not read. To load them:

```typescript
options: {
  settingSources: ["user", "project", "local"],
  systemPrompt: { type: "preset", preset: "claude_code" },
}
```
</critical>

### Permission Modes

| Mode | Behavior |
|---|---|
| `"default"` | Prompts for approval on dangerous operations |
| `"acceptEdits"` | Auto-approves file edits; prompts for other actions |
| `"bypassPermissions"` | Skips all checks (requires `allowDangerouslySkipPermissions: true`) |
| `"plan"` | Planning only — no tool execution |
| `"dontAsk"` | Denies anything not pre-approved (no prompts) |

### Custom Permission Callback

```typescript
canUseTool: async (toolName, input, { signal, suggestions }) => {
  if (toolName === "Bash" && input.command.includes("rm")) {
    return { behavior: "deny", message: "Destructive commands blocked" };
  }
  return { behavior: "allow", updatedInput: input };
}
```

## Message Types

The `query()` generator yields `SDKMessage` objects. The most important types:

### `SDKSystemMessage` (type: `"system"`)

Emitted once at session start with initialization details.

```typescript
{
  type: "system",
  subtype: "init",
  session_id: string,
  model: string,
  tools: string[],
  mcp_servers: { name: string; status: string }[],
  cwd: string,
  permissionMode: PermissionMode,
  claude_code_version: string,
}
```

### `SDKAssistantMessage` (type: `"assistant"`)

Claude's response turns. Content follows the Anthropic Messages API format.

```typescript
{
  type: "assistant",
  uuid: string,
  session_id: string,
  parent_tool_use_id: string | null,
  message: {
    role: "assistant",
    content: Array<TextBlock | ToolUseBlock | ThinkingBlock>,
  },
}
```

Extract text and tool calls from `message.content`:

```typescript
for (const block of message.message.content) {
  if (block.type === "text") console.log(block.text);
  if (block.type === "tool_use") console.log(block.name, block.input);
}
```

### `SDKResultMessage` (type: `"result"`)

Emitted once when the agent finishes.

**Success** (`subtype: "success"`):
```typescript
{
  type: "result",
  subtype: "success",
  result: string,              // Final text output
  total_cost_usd: number,
  duration_ms: number,
  num_turns: number,
  structured_output?: unknown, // If outputFormat was set
  usage: { inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens },
}
```

**Error subtypes**: `"error_max_turns"` | `"error_during_execution"` | `"error_max_budget_usd"` | `"error_max_structured_output_retries"`

Error results have `is_error: true` and an `errors: string[]` array.

### Other Message Types

| Type | When |
|---|---|
| `SDKUserMessage` (`"user"`) | User prompts (including synthetic tool results) |
| `SDKPartialAssistantMessage` | Streaming chunks (when `includePartialMessages: true`) |
| `SDKCompactBoundaryMessage` | Context compression boundary |
| `SDKStatusMessage` | Status updates |
| `SDKToolUseSummaryMessage` | Tool use summaries |
| `SDKRateLimitEvent` | Rate limit notifications |
| `SDKHookStartedMessage` / `SDKHookProgressMessage` / `SDKHookResponseMessage` | Hook lifecycle |
| `SDKTaskNotificationMessage` / `SDKTaskStartedMessage` | Subagent lifecycle |

## Custom MCP Tools

Define tools with Zod 4 schemas and wire them into agents via in-process MCP servers.

### `tool()` — Define a Tool

```typescript
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const myTool = tool(
  "tool_name",                              // Tool name
  "Description of what it does",            // Description
  { input: z.string(), count: z.number() }, // Zod schema for input
  async (args) => {                         // Handler
    return {
      content: [{ type: "text", text: `Result: ${args.input}` }],
    };
  },
);
```

Optional 5th argument for annotations:

```typescript
tool("name", "desc", schema, handler, {
  annotations: { readOnly: true, destructive: false, openWorld: false },
});
```

### `createSdkMcpServer()` — Bundle Tools Into a Server

```typescript
import { createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";

const server = createSdkMcpServer({
  name: "my-server",
  version: "1.0.0",
  tools: [myTool, anotherTool],
});
```

<critical>
**`createSdkMcpServer()` returns the full MCP config entry** `{ type: "sdk", name, instance }`. Pass it directly as an mcpServers value — do NOT wrap it again:

```typescript
// CORRECT:
mcpServers: { "my-server": server }

// WRONG — double wrapping causes "X.connect is not a function":
mcpServers: { "my-server": { type: "sdk", name: "my-server", instance: server } }
```
</critical>

### Tool Naming Convention

MCP tools are namespaced when used. Tool name follows the pattern `mcp__{serverName}__{toolName}`. When setting `allowedTools`, use the full namespaced name:

```typescript
allowedTools: ["mcp__my-server__tool_name"]
```

## MCP Server Configuration

### External Servers

```typescript
mcpServers: {
  // Stdio (spawns a child process)
  "my-server": {
    command: "npx",
    args: ["my-mcp-server@latest"],
    env: { API_KEY: "..." },
  },

  // SSE
  "remote-server": {
    type: "sse",
    url: "https://mcp.example.com/sse",
    headers: { Authorization: "Bearer ..." },
  },

  // HTTP
  "http-server": {
    type: "http",
    url: "https://mcp.example.com/mcp",
    headers: { Authorization: "Bearer ..." },
  },

  // In-process SDK server
  "local-tools": createSdkMcpServer({ name: "local-tools", tools: [...] }),
}
```

## Subagents

Define specialized agents that the main agent can delegate to via the `Task` tool.

```typescript
options: {
  allowedTools: ["Read", "Glob", "Grep", "Task"],
  agents: {
    "code-reviewer": {
      description: "Reviews code for quality and security issues",
      prompt: "You are an expert code reviewer. Focus on bugs and security.",
      model: "opus",           // "sonnet" | "opus" | "haiku" | "inherit"
      tools: ["Read", "Glob", "Grep"],
      maxTurns: 5,
    },
    "test-runner": {
      description: "Runs tests and reports results",
      prompt: "Run the project's test suite and summarize failures.",
      model: "haiku",
      tools: ["Bash", "Read"],
    },
  },
}
```

The `model` field accepts short names: `"sonnet"`, `"opus"`, `"haiku"`, `"inherit"`.

## Hooks

React to agent events programmatically.

```typescript
hooks: {
  PostToolUse: [{
    matcher: "Edit|Write",   // Regex matching tool names
    hooks: [async (input, toolUseID, { signal }) => {
      console.log(`File modified: ${input.tool_input?.file_path}`);
      return {};  // Return SyncHookJSONOutput
    }],
  }],
  Stop: [{
    hooks: [async (input) => {
      console.log("Agent stopped");
      return {};
    }],
  }],
}
```

**Hook events**: `PreToolUse` | `PostToolUse` | `PostToolUseFailure` | `Notification` | `UserPromptSubmit` | `SessionStart` | `SessionEnd` | `Stop` | `SubagentStart` | `SubagentStop` | `PreCompact` | `PermissionRequest` | `Setup` | `TeammateIdle` | `TaskCompleted` | `ConfigChange` | `WorktreeCreate` | `WorktreeRemove`

**Hook return values:**

```typescript
type SyncHookJSONOutput = {
  continue?: boolean;         // Continue execution (default true)
  suppressOutput?: boolean;   // Hide tool output from conversation
  stopReason?: string;        // Stop the agent with this reason
  decision?: "approve" | "block"; // For PermissionRequest hooks
  systemMessage?: string;     // Inject a system message
  reason?: string;            // Human-readable reason
};
```

## Structured Output

Force the agent to return JSON matching a schema:

```typescript
const result = query({
  prompt: "Analyze this codebase and return a summary",
  options: {
    outputFormat: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          files_analyzed: { type: "number" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                file: { type: "string" },
                severity: { type: "string", enum: ["low", "medium", "high"] },
                description: { type: "string" },
              },
              required: ["file", "severity", "description"],
            },
          },
        },
        required: ["files_analyzed", "issues"],
      },
    },
  },
});

// Access via result message:
// message.structured_output contains the parsed JSON
```

## Thinking Configuration

```typescript
// Adaptive (default for Opus 4.6+ — Claude decides when to think)
thinking: { type: "adaptive" }

// Fixed budget
thinking: { type: "enabled", budgetTokens: 10000 }

// Disabled
thinking: { type: "disabled" }
```

## Sandbox

Restrict file system and network access:

```typescript
sandbox: {
  enabled: true,
  autoAllowBashIfSandboxed: true,  // Auto-approve bash when sandboxed
  filesystem: {
    allowWrite: ["/path/to/project"],
    denyWrite: ["/etc", "/usr"],
    denyRead: ["/home/user/.ssh"],
  },
  network: {
    allowedDomains: ["api.example.com"],
    allowLocalBinding: true,
  },
  excludedCommands: ["docker"],    // Commands that bypass sandbox
}
```

## Session Management

```typescript
// Resume a previous session
options: { resume: "session-id-here" }

// Resume at a specific message
options: { resume: "session-id", resumeSessionAt: "message-uuid" }

// Continue most recent session
options: { continue: true }

// Fork into a new session from a resumed point
options: { resume: "session-id", forkSession: true }
```

## Built-in Tools

Available when using the `claude_code` preset or listing tool names in `allowedTools`:

| Tool | Purpose |
|---|---|
| `Read` | Read files (text, images, PDFs, notebooks) |
| `Write` | Create new files |
| `Edit` | Edit files with exact string replacement |
| `Glob` | Find files by glob pattern |
| `Grep` | Search file contents with regex |
| `Bash` | Execute shell commands |
| `BashOutput` | Read output from background bash shells |
| `KillBash` | Kill background shells |
| `WebSearch` | Search the web |
| `WebFetch` | Fetch and process web content |
| `Task` | Delegate to a subagent |
| `AskUserQuestion` | Prompt user for input |
| `NotebookEdit` | Edit Jupyter notebook cells |
| `TodoWrite` | Manage task lists |
| `ListMcpResources` / `ReadMcpResource` | Access MCP resources |

## Complete Examples

### Minimal Agent

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const msg of query({ prompt: "Explain what src/index.ts does" })) {
  if (msg.type === "assistant") {
    for (const b of msg.message.content) {
      if (b.type === "text") process.stdout.write(b.text);
    }
  }
}
```

### Agent With Custom Tools

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const dbQuery = tool(
  "run_sql",
  "Execute a read-only SQL query against the database",
  { sql: z.string().describe("SQL SELECT query") },
  async ({ sql }) => {
    const rows = await db.query(sql);
    return { content: [{ type: "text", text: JSON.stringify(rows) }] };
  },
);

const server = createSdkMcpServer({ name: "db", tools: [dbQuery] });

for await (const msg of query({
  prompt: "How many users signed up this month?",
  options: {
    model: "claude-sonnet-4-6",
    mcpServers: { db: server },
    allowedTools: ["mcp__db__run_sql"],
    maxTurns: 5,
  },
})) {
  if (msg.type === "result" && msg.subtype === "success") {
    console.log(msg.result);
  }
}
```

### CI/CD Code Review Agent

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

const result = query({
  prompt: `Review the git diff for this PR. Check for:
    1. Security vulnerabilities
    2. Performance issues
    3. Type safety problems
    Report findings as structured output.`,
  options: {
    model: "claude-opus-4-6",
    cwd: process.env.GITHUB_WORKSPACE,
    permissionMode: "bypassPermissions",
    allowDangerouslySkipPermissions: true,
    allowedTools: ["Read", "Glob", "Grep", "Bash"],
    maxTurns: 20,
    maxBudgetUsd: 1.0,
    outputFormat: {
      type: "json_schema",
      schema: {
        type: "object",
        properties: {
          findings: {
            type: "array",
            items: {
              type: "object",
              properties: {
                file: { type: "string" },
                line: { type: "number" },
                severity: { type: "string" },
                message: { type: "string" },
              },
              required: ["file", "severity", "message"],
            },
          },
          summary: { type: "string" },
          approved: { type: "boolean" },
        },
        required: ["findings", "summary", "approved"],
      },
    },
  },
});

let review;
for await (const msg of result) {
  if (msg.type === "result" && msg.subtype === "success") {
    review = msg.structured_output;
  }
}
console.log(JSON.stringify(review, null, 2));
```

### Multi-Turn Conversation (V2 API — Unstable)

```typescript
import { unstable_v2_createSession } from "@anthropic-ai/claude-agent-sdk";

const session = unstable_v2_createSession({
  model: "claude-sonnet-4-6",
  permissionMode: "acceptEdits",
  allowedTools: ["Read", "Edit"],
});

await session.send("Read src/config.ts and explain the structure");
for await (const msg of session.stream()) {
  // process first turn
}

await session.send("Now add a new config option for maxRetries");
for await (const msg of session.stream()) {
  // process second turn
}

session.close();
```

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `Claude Code process exited with code 1` | Nested session detection | Unset `CLAUDECODE` env var: `delete process.env.CLAUDECODE` |
| `ERESOLVE unable to resolve dependency tree` | Zod version mismatch | Use `zod@^4.0.0`, not v3 |
| `X.connect is not a function` | Double-wrapped MCP server config | Pass `createSdkMcpServer()` result directly — it already returns `{ type: "sdk", name, instance }` |
| Tool calls denied silently | Permission mode too restrictive | Add tool names to `allowedTools` array (MCP tools use `mcp__{server}__{tool}` format) |
| Agent can't find project files | Missing `cwd` option | Set `cwd` to the project root directory |
| `CLAUDE.md` instructions not loaded | Settings not auto-loaded since v0.1.0 | Set `settingSources: ["user", "project"]` |
| Agent stops immediately | `maxTurns: 1` with tool use | Increase `maxTurns` to allow tool call + response cycles |

## Migration Notes (v0.0.x to v0.1.0+)

- Package renamed: `@anthropic-ai/claude-code` -> `@anthropic-ai/claude-agent-sdk`
- System prompt no longer defaults to Claude Code's prompt — set explicitly with `systemPrompt: { type: "preset", preset: "claude_code" }`
- Settings no longer auto-loaded — set `settingSources` explicitly
- Zod peer dependency changed from v3 to v4
