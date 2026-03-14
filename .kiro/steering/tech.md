---
inclusion: always
---

# Technology Stack

## Architecture

Hybrid plugin + installation architecture. Slash commands distributed via Claude Code plugin system for easy sharing, while installation scripts handle the broader tooling ecosystem (binary utilities, agent-docs, MCP servers, hooks).

## Core Technologies

- **Languages**: TypeScript, Bash
- **Runtime**: Bun (compilation and execution)
- **Build**: Bun compiler (standalone executables in `dist/`)

## Key Libraries

- **Zod** - Runtime validation and type safety
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **openai** - Responses API integration
- **Commander.js** - CLI argument parsing
- **Eta** - Template rendering
- **proper-lockfile** - File concurrency control
- **write-file-atomic** - Crash-safe file writes

## Development Standards

### Type Safety
TypeScript strict mode. No `any` types or `@ts-ignore`. Plain functions over classes unless explicitly directed.

### Code Quality
Early returns over nested conditionals. YAGNI principle. Comments only for non-obvious constraints.

## Development Environment

### Required Tools
- Bun runtime
- Claude CLI (`claude`)
- Git

### Common Commands
```bash
# Build: compile TypeScript to standalone executables
cd typescript && bun run build

# Install user-level: agent-docs, scripts, MCP servers
ai install --scope user

# Install project-level: plugin, Cursor rules, configs
ai install --scope project
```

## Key Architecture Decisions

1. **Hybrid Plugin + Installation** - Plugin system for slash commands, installers for broader tooling
2. **Dual Repository Pattern** - `.git` for team code, `.local` for private AI configs via `lgit`
3. **Markdown-Based Slash Commands** - YAML frontmatter for permissions, pattern matching for tool control
4. **MCP Protocol for Tool Integration** - Stdio-based MCP servers installed globally via `bun link`
5. **Deep Merge Settings** - Preserve existing configs via deep merge with Zod validation
6. **User vs Project Installation** - `install-user.ts` for home directory, `install-project.ts` for project directory
7. **Bun-Compiled Executables** - TypeScript CLI tools compiled to standalone binaries
8. **Comment Marker-Based Merging** - HTML comment markers in CLAUDE.md for safe section replacement
