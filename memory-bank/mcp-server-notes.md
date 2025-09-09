# MCP Server Implementation Guide

<critical>
MCP (Model Context Protocol) enables AI agents to access external tools/data via JSON-RPC 2.0. Use @modelcontextprotocol/sdk for TypeScript implementation.
</critical>

## Tech Stack

- **Runtime**: Bun (fast TypeScript execution)
- **Library**: `@modelcontextprotocol/sdk` v1.17.5+
- **Validation**: Zod schemas
- **Transport**: stdio or HTTP

## Core Architecture

<required>
```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
name: "cursor-keyboard-shortcuts",
version: "1.0.0"
});

````
</required>

### Three Component Types:

#### Tools (Actions)
```typescript
server.tool("tool-name", {
  param: z.string()
}, async ({ param }) => ({
  content: [{ type: "text", text: result }]
}));
````

#### Resources (Data Access)

```typescript
server.resource("resource-name", async () => ({
  contents: [{ type: "text", text: data }],
}));
```

#### Prompts (Templates)

```typescript
server.prompt(
  "prompt-name",
  {
    input: z.string(),
  },
  async ({ input }) => ({
    messages: [{ role: "user", content: { type: "text", text: prompt } }],
  }),
);
```

## OS Detection & Paths

### Cross-platform keybindings.json paths:

```typescript
function getKeybindingsPath(): string {
  const home = os.homedir();
  const platform = os.platform();

  switch (platform) {
    case "darwin":
      return `${home}/Library/Application Support/Cursor/User/keybindings.json`;
    case "win32":
      return `${process.env.APPDATA}/Cursor/User/keybindings.json`;
    case "linux":
      return `${home}/.config/Cursor/User/keybindings.json`;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }
}
```

## Keybindings Structure

<example type="valid">
```json
[
  {
    "key": "ctrl+shift+p",
    "command": "workbench.action.showCommands",
    "when": "editorTextFocus",
    "args": { "optional": "data" }
  }
]
```
</example>

### Required fields: `key`, `command`

### Optional fields: `when` (context), `args` (parameters)

## OpenAI Responses API Integration

<required>
```typescript
const response = await openai.responses.create({
  prompt: {
    id: "pmpt_68c0898bb23081978687ee5fdf5f690d06a197956797278f",
    variables: {
      frequency, task_description, operating_system, existing_shortcuts
    }
  }
});
```
</required>

### Response Schema:

```typescript
interface ShortcutRecommendationResponse {
  when: string; // VS Code/Cursor context expression for all recommendations
  recommendations: Array<{
    keystroke: string;
    mnemonic: string;
    justification: string;
    conflicts: Array<{ keystroke: string; mnemonic: string }>;
  }>;
  errors: string[];
}
```

## Safe File Updates

<critical>
Use atomic writes + file locking + backups for keybindings.json updates.
</critical>

### Required Dependencies:

- `write-file-atomic`: Atomic file writes
- `proper-lockfile`: Process-level locking
- `jsonc-parser`: JSON with comments support

### Safe Update Pattern:

1. Acquire file lock
2. Create timestamped backup
3. Read/parse existing keybindings
4. Merge with conflict detection
5. Validate structure
6. Write atomically
7. Release lock (rollback on error)

## MCP Server Deployment

### Bun executable:

```bash
bun build src/server.ts --compile --outfile=bin/cursor-shortcuts-mcp
```

### Cursor configuration (.cursor/mcp.json):

```json
{
  "mcpServers": {
    "cursor-shortcuts": {
      "command": "/path/to/bin/cursor-shortcuts-mcp"
    }
  }
}
```

## Error Handling

<danger>
Always implement exponential backoff for API calls and comprehensive rollback for file operations.
</danger>

### API Errors:

- **429**: Rate limit → exponential backoff
- **401**: Auth failure → check API key
- **5xx**: Server error → retry with backoff
- **4xx**: Client error → don't retry

### File Operation Errors:

- Lock timeout → fail gracefully
- Write failure → rollback from backup
- Parse error → preserve original file

## Key Implementation Tools

### For MCP server:

```typescript
server.tool(
  "recommend-shortcuts",
  {
    frequency: z.string(),
    task_description: z.string(),
  },
  async ({ frequency, task_description }) => {
    // Auto-detect system info - no separate tool needed
    const operating_system = getOperatingSystemName(process.platform);
    const existing_shortcuts = JSON.stringify(await readCurrentShortcuts());

    const recommendations = await getShortcutRecommendations({
      frequency,
      task_description,
      operating_system,
      existing_shortcuts,
    });
    return {
      content: [{ type: "text", text: JSON.stringify(recommendations) }],
    };
  },
);

server.tool(
  "update-shortcut",
  {
    keystroke: z.string(),
    command: z.string(),
    when: z.string().optional(),
  },
  async ({ keystroke, command, when }) => {
    await updateKeybindingsSafely([
      { key: keystroke, command, ...(when && { when }) },
    ]);
    return {
      content: [{ type: "text", text: `Added: ${keystroke} -> ${command}` }],
    };
  },
);
```

## Performance Considerations

- Validate inputs with Zod before processing

## Testing Strategy

Test cross-platform paths, conflict detection, atomic operations, API error scenarios.

<required>
Essential for production: file locking, atomic writes, input validation, and cross-platform compatibility.
</required>
