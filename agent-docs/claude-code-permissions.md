# Claude Code Permissions and Tools Reference

This document provides a comprehensive reference for Claude Code tool-specific permissions and supported tools.

## Supported Claude Code Tools

| Tool             | Description                                          | Permissions Required |
| ---------------- | ---------------------------------------------------- | -------------------- |
| **Agent**        | Runs a sub-agent to handle complex, multi-step tasks | No                   |
| **Bash**         | Executes shell commands in your environment          | Yes                  |
| **Edit**         | Makes targeted edits to specific files               | Yes                  |
| **Glob**         | Finds files based on pattern matching                | No                   |
| **Grep**         | Searches for patterns in file contents               | No                   |
| **LS**           | Lists files and directories                          | No                   |
| **MultiEdit**    | Performs multiple edits on a single file atomically  | Yes                  |
| **NotebookEdit** | Modifies Jupyter notebook cells                      | Yes                  |
| **NotebookRead** | Reads and displays Jupyter notebook contents         | No                   |
| **Read**         | Reads the contents of files                          | No                   |
| **TodoRead**     | Reads the current session's task list                | No                   |
| **TodoWrite**    | Creates and manages structured task lists            | No                   |
| **WebFetch**     | Fetches content from a specified URL                 | Yes                  |
| **WebSearch**    | Performs web searches with domain filtering          | Yes                  |
| **Write**        | Creates or overwrites files                          | Yes                  |

## Tool-Specific Permission Rules Syntax

Claude Code uses a specific syntax for tool-specific permissions that allows fine-grained control over what actions are allowed or denied.

### Basic Syntax

Permission rules follow the format: `ToolName(pattern)`

### Bash Tool Permissions

The Bash tool supports two main matching patterns:

- **Exact command match**: `Bash(npm run build)`

  - Allows only the exact command specified
  - No variations or additional arguments permitted

- **Prefix match**: `Bash(npm run test:*)`
  - Allows commands that start with the specified prefix
  - The `*` wildcard matches any characters after the prefix

**Important**: Claude Code is "aware of shell operators", so a prefix match won't allow chained commands like `safe-cmd && other-cmd`.

#### Examples:

```json
{
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(git log:*)",
      "Bash(npm run test:*)",
      "Bash(bun run lint)"
    ],
    "deny": ["Bash(rm:*)", "Bash(curl:*)"]
  }
}
```

### Read & Edit Tool Permissions

Read and Edit tools follow the gitignore specification for path matching:

- **Directory patterns**: `Edit(docs/**)` - Matches edits in docs directory and subdirectories
- **Specific files**: `Read(~/.zshrc)` - Matches reads to specific file
- **Absolute paths**: `Edit(//tmp/scratch.txt)` - Matches edits to absolute path

#### Examples:

```json
{
  "permissions": {
    "allow": ["Edit(src/**)", "Read(~/.config/**)", "Write(docs/*.md)"],
    "deny": ["Edit(package.json)", "Write(/etc/**)"]
  }
}
```

### WebFetch Tool Permissions

WebFetch supports domain-specific restrictions:

- **Domain-specific**: `WebFetch(domain:example.com)`
  - Restricts fetching to specific domains

#### Examples:

```json
{
  "permissions": {
    "allow": [
      "WebFetch(domain:docs.anthropic.com)",
      "WebFetch(domain:api.github.com)"
    ],
    "deny": ["WebFetch(domain:suspicious-site.com)"]
  }
}
```

### MCP (Model Context Protocol) Tool Permissions

MCP tools can be matched at different levels:

- **Server tool match**: `mcp__puppeteer`
  - Matches all tools from the puppeteer MCP server
- **Specific tool match**: `mcp__puppeteer__puppeteer_navigate`
  - Matches only the specific navigate tool from puppeteer server

#### Examples:

```json
{
  "permissions": {
    "allow": ["mcp__filesystem", "mcp__git__git_status"]
  }
}
```

## References

- [Claude Code IAM Documentation](https://docs.anthropic.com/en/docs/claude-code/iam)
- [Claude Code Settings Documentation](https://docs.anthropic.com/en/docs/claude-code/settings)
