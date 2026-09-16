# AI Resources TypeScript Tooling

Installers, codemods, and CLI utilities for this repository's Claude Code and
Codex resources, compiled to standalone executables with Bun.

## Features

- **`ai` CLI**: User- and project-level installation, skill scaffolding, worktree creation, and hook installation
- **Codex Plugin Generation**: Builds the Codex packaging from the canonical Claude skill sources
- **Codemods**: `ts-morph`-backed import rewriting across a TypeScript project
- **Schema Utilities**: JSON → Zod → JSON Schema conversion

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
ai install --scope user
echo '{"example": "data"}' | json-to-schema
```

This will make the following commands available globally:

- `ai` - Unified CLI for AI workflow resources
- `json-to-schema` - Convert JSON to JSON Schema via Zod
- `notify` - Notify immediately or after a wrapped command finishes (installed by `ai install --scope user`)

See the root `README.md` for `notify` invocation and audio fallback behavior.

## Usage

### CLI Usage

The `ai` command provides a unified interface for all AI workflow resources:

```bash
# Install user-level resources (home directory)
ai install --scope user

# Install project-level resources (current directory)
ai install --scope project
```

Or use npm scripts during development:

```bash
bun run install-user
bun run install-project
```

## Scripts

- `bun run build` - Build the CLI tool
- `bun run install-user` - Install user-level resources (runs `ai install --scope user`)
- `bun run install-project` - Install project-level resources (runs `ai install --scope project`)
- `bun run type-check` - Type check the project
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

