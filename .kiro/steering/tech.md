---
inclusion: always
---

# Technology Stack

## Architecture

Hybrid plugin + installation architecture: skills, agents, and hooks ship via the Claude Code plugin system, while installation scripts handle the broader tooling ecosystem (binary utilities, agent-docs). TypeScript and Bash on the Bun runtime, compiled to standalone executables in `dist/`.

## Common Commands

```bash
# Build: compile TypeScript to standalone executables
cd typescript && bun run build

# Regenerate Codex plugins via skill-sync from the shared skills
cd typescript && bun run build:codex-plugin

# Install user-level: agent-docs, scripts
ai install --scope user

# Install project-level: plugin, configs
ai install --scope project
```

## Key Architecture Decisions

1. **Hybrid Plugin + Installation** - Plugin system for skills, agents, and hooks; installers for broader tooling
2. **Dual Repository Pattern** - `.git` for team code, `.local` for private AI configs via `lgit`
3. **Markdown-Based Skills** - YAML frontmatter for permissions, pattern matching for tool control
4. **User vs Project Installation** - `install-user.ts` for home directory, `install-project.ts` for project directory
5. **Bun-Compiled Executables** - TypeScript CLI tools compiled to standalone binaries
6. **Comment Marker-Based Merging** - HTML comment markers in CLAUDE.md for safe section replacement
