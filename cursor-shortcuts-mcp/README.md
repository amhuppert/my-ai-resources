# Cursor Keyboard Shortcuts MCP Server

An MCP (Model Context Protocol) server that provides AI agents with tools to intelligently configure keyboard shortcuts in Cursor IDE.

## Features

- **Smart Recommendations**: Uses OpenAI to suggest optimal keyboard shortcuts based on frequency and task description
- **Cross-Platform**: Works on macOS, Windows, and Linux
- **Safe File Operations**: Atomic writes with file locking and automatic backups
- **Conflict Detection**: Identifies and reports shortcut conflicts
- **Error Handling**: Comprehensive error handling with exponential backoff

## Installation

1. **Build the executable**:

   ```bash
   bun install
   bun run build
   ```

2. **Configure Cursor**: Create or update `.cursor/mcp.json` in your project:

   ```json
   {
     "mcpServers": {
       "cursor-shortcuts": {
         "command": "/absolute/path/to/cursor-shortcuts-mcp/bin/cursor-shortcuts-mcp"
       }
     }
   }
   ```

3. **Set OpenAI API Key**:

   ```bash
   export OPENAI_API_KEY="your-api-key"
   ```

   **Note**: This server uses OpenAI's Responses API with a stored prompt template (ID: `pmpt_68c0898bb23081978687ee5fdf5f690d06a197956797278f`). The prompt template accepts variables for frequency, task_description, operating_system, and existing_shortcuts.

## MCP Tools

### `recommend-shortcuts`

Get intelligent keyboard shortcut recommendations.

**Parameters**:

- `frequency`: How often the shortcut will be used ("daily", "hourly", "occasionally")
- `task_description`: The VS Code/Cursor command to bind

**Example**:

```typescript
// AI agent usage
await callTool("recommend-shortcuts", {
  frequency: "daily",
  task_description: "workbench.action.showCommands",
});
```

**Response**:

```json
{
  "when": "editorTextFocus",
  "recommendations": [
    {
      "keystroke": "ctrl+shift+p",
      "mnemonic": "Command Palette",
      "justification": "Standard VS Code shortcut, high frequency use",
      "conflicts": []
    }
  ],
  "errors": []
}
```

### `update-shortcut`

Add or update a keyboard shortcut in Cursor.

**Parameters**:

- `keystroke`: Key combination (e.g., "ctrl+shift+p")
- `command`: Cursor command to bind
- `when`: Optional context clause

**Example**:

```typescript
// AI agent usage
await callTool("update-shortcut", {
  keystroke: "ctrl+alt+f",
  command: "workbench.action.findInFiles",
  when: "!inQuickOpen",
});
```

**Response**:

```json
{
  "success": true,
  "message": "Added shortcut: ctrl+alt+f -> workbench.action.findInFiles",
  "conflicts": [
    "Key ctrl+alt+f conflicts: existing \"format\" vs new \"findInFiles\""
  ]
}
```

## File Locations

The server automatically detects the correct keybindings file location:

- **macOS**: `~/Library/Application Support/Cursor/User/keybindings.json`
- **Windows**: `%APPDATA%/Cursor/User/keybindings.json`
- **Linux**: `~/.config/Cursor/User/keybindings.json`

## Safety Features

- **Atomic writes**: Prevents file corruption
- **File locking**: Prevents concurrent access
- **Automatic backups**: Timestamped backups before changes
- **Rollback on failure**: Restores from backup if operations fail
- **JSON-C support**: Handles comments in keybindings files

## Error Handling

The server provides detailed error responses:

- **OpenAI API errors**: Rate limiting, authentication, server errors
- **File operation errors**: Permission issues, parse errors, lock timeouts
- **Validation errors**: Invalid input parameters or malformed responses

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev

# Type checking
bun run typecheck

# Build executable
bun run build
```

## Requirements

- **Bun**: JavaScript runtime and package manager
- **OpenAI API Key**: For shortcut recommendations
- **Cursor IDE**: Target application for keyboard shortcuts

## Architecture

- **MCP Server**: Uses `@modelcontextprotocol/sdk`
- **File Operations**: `write-file-atomic`, `proper-lockfile`, `jsonc-parser`
- **Validation**: Zod schemas for type safety
- **OpenAI Integration**: Responses API with stored prompt templates

## License

MIT
