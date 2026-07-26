---
inclusion: always
---

# Technology Stack

## Architecture

Hybrid plugin + installation architecture: slash commands ship via the Claude Code plugin system, while installation scripts handle the broader tooling ecosystem (binary utilities, agent-docs, hooks). TypeScript and Bash on the Bun runtime, compiled to standalone executables in `dist/`.

## Common Commands

```bash
# Build: compile TypeScript to standalone executables
cd typescript && bun run build

# Regenerate the Codex plugin from the shared skills
cd typescript && bun run build:codex-plugin

# Install user-level: agent-docs, scripts
ai install --scope user

# Install project-level: plugin, configs
ai install --scope project
```

## Key Architecture Decisions

1. **Hybrid Plugin + Installation** - Plugin system for slash commands, installers for broader tooling
2. **Dual Repository Pattern** - `.git` for team code, `.local` for private AI configs via `lgit`
3. **Markdown-Based Slash Commands** - YAML frontmatter for permissions, pattern matching for tool control
4. **MCP Protocol for Tool Integration** - Stdio-based MCP servers compiled to standalone binaries and bundled into the plugin's `servers/` directory
5. **Deep Merge Settings** - Preserve existing configs via deep merge with Zod validation
6. **User vs Project Installation** - `install-user.ts` for home directory, `install-project.ts` for project directory
7. **Bun-Compiled Executables** - TypeScript CLI tools compiled to standalone binaries
8. **Comment Marker-Based Merging** - HTML comment markers in CLAUDE.md for safe section replacement
