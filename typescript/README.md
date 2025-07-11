# Claude Code Settings Manager

TypeScript types and utilities for managing Claude Code settings.json configuration files.

## Features

- **Complete TypeScript Types**: Comprehensive type definitions for Claude Code settings using Zod
- **Settings Installation**: Deep merge functionality for installing settings while preserving existing configuration
- **Validation**: Runtime validation of settings files using Zod schemas
- **CLI Interface**: Command-line tool for installing settings files

## Installation

### Local Development

```bash
bun install
```

### Global Installation

To install the utilities globally so they can be used from anywhere:

```bash
# Build the project first
bun run build

# Link the package globally
bun link

# Now you can use the utilities from anywhere
echo '{"example": "data"}' | json-to-schema
```

This will make the following commands available globally:

- `json-to-schema` - Convert JSON to JSON Schema via Zod
- `claude-settings` - Install Claude Code settings

## Usage

### CLI Usage

Install settings from a JSON file:

```bash
bun run install-settings example-settings.json
```

Or use the built version:

```bash
bun run build
./dist/install-settings.js example-settings.json
```

### Programmatic Usage

```typescript
import {
  ClaudeCodeSettings,
  validateSettings,
  installSettings,
} from "./lib/claude-code-settings.js";

// Validate settings
const settings = validateSettings({
  permissions: {
    tools: {
      filesystem: true,
      bash: true,
    },
  },
});

// Install settings programmatically
installSettings(settings);
```

## Type Definitions

The library provides comprehensive TypeScript types for:

- `ClaudeCodeSettings` - Main settings interface
- `Permissions` - Permission configuration with allow/deny rules

## Settings Structure

```json
{
  "apiKeyHelper": "/usr/local/bin/generate-claude-key.sh",
  "cleanupPeriodDays": 20,
  "includeCoAuthoredBy": false,
  "env": {
    "NODE_ENV": "development",
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1"
  },
  "permissions": {
    "allow": [
      "WebFetch",
      "WebSearch",
      "Bash(npm run lint)",
      "Bash(npm run test:*)",
      "Bash(git diff:*)"
    ],
    "deny": ["Bash(curl:*)", "Bash(rm:*)"],
    "additionalDirectories": ["~/projects", "~/workspace"],
    "defaultMode": "strict"
  }
}
```

## Available Settings

- **`apiKeyHelper`** - Path to script for generating auth value
- **`cleanupPeriodDays`** - Days to retain chat transcripts (default: 30)
- **`includeCoAuthoredBy`** - Include "co-authored-by Claude" in git commits (default: true)
- **`env`** - Environment variables to set
- **`permissions.allow`** - Array of allowed permission rules
- **`permissions.deny`** - Array of denied permission rules
- **`permissions.additionalDirectories`** - Extra directories that can be accessed
- **`permissions.defaultMode`** - Default permission mode
- **`permissions.disableBypassPermissionsMode`** - Set to "disable" to prevent bypass mode

## Permission Rules

Permission rules follow the format `Tool(pattern)`:

- `WebFetch` - Allow web fetching
- `WebSearch` - Allow web searching
- `Bash(npm run lint)` - Allow specific bash command
- `Bash(git diff:*)` - Allow git diff with any arguments
- `Bash(curl:*)` - Allow curl with any arguments (often denied for security)

## Scripts

- `bun run build` - Build the CLI tool
- `bun run install-settings <file>` - Install settings from a file
- `bun run type-check` - Type check the project
- `bun run dev <file>` - Run the installer in development mode
- `bun run json-to-schema` - Convert JSON from stdin to JSON Schema via Zod

## JSON to Schema Converter

This project includes a utility to convert JSON data to JSON Schema via Zod:

```bash
# Local usage (development)
echo '{"name": "John", "age": 30}' | bun run json-to-schema

# Global usage (after bun link)
echo '{"name": "John", "age": 30}' | json-to-schema

# Or pipe from a file
cat example.json | json-to-schema
```

The utility:

1. Reads JSON data from stdin
2. Converts it to a Zod schema using `json-to-zod`
3. Converts the Zod schema to JSON Schema using `zod-to-json-schema`
4. Formats the output with Prettier
5. Prints the JSON Schema to stdout

**Example:**

```bash
$ echo '{"user": {"name": "Alice", "age": 25}}' | bun run json-to-schema
{
  "type": "object",
  "properties": {
    "user": {
      "type": "object",
      "properties": {
        "name": {
          "type": "string"
        },
        "age": {
          "type": "number"
        }
      },
      "required": ["name", "age"],
      "additionalProperties": false
    }
  },
  "required": ["user"],
  "additionalProperties": false,
  "$schema": "http://json-schema.org/draft-07/schema#"
}
```

## Deep Merge Behavior

The installer performs a deep merge of settings:

- Objects are merged recursively
- Arrays are replaced entirely (not merged)
- Primitive values are replaced
- Existing configuration is preserved where not overwritten
