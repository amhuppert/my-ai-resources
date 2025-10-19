# Current Focus

Migrating to hybrid plugin + installation script architecture to leverage Claude Code's Plugin system while preserving full functionality.

## Architecture Decision

**Hybrid Model (Option A)**: Plugin for Claude Code-specific features + installation scripts for broader tooling ecosystem.

### Plugin Contains (claude/plugin/)

- All 7 slash commands (commit, reflection, update-project-brief, compress, init-document-map, local-init, local-commit)
- Shareable via `/plugin install` to other projects

### User Installation Provides

- agent-docs → ~/.claude/agent-docs (preserves @agent-docs/ reference pattern)
- Binary utilities → ~/.local/bin/ (lgit, code-tree, read-file, push-main)
- cursor-shortcuts-mcp → global via bun link
- CLAUDE-user.md with XML tag merging
- Settings with deep-merge logic
- MCP servers (cursor-shortcuts + context7)
- rins_hooks
- Plugin marketplace registration and installation (commands available globally)

### Project Installation Provides

- Cursor rules → .cursor/rules
- CLAUDE-project.md with XML tag merging
- Conditional notification hook
- Code-formatter hook

## Implementation Tasks

- [x] Create plugin directory structure (claude/plugin/.claude-plugin/)
- [x] Create plugin.json manifest
- [x] Create marketplace.json manifest
- [x] Move claude/commands/ to claude/plugin/commands/
- [x] Update install-user.ts: remove commands sync
- [x] Update install-user.ts: add cursor-shortcuts-mcp global installation (bun build + bun link)
- [x] Update install-user.ts: add cursor-shortcuts-mcp MCP server registration
- [x] Update install-user.ts: add plugin marketplace registration and installation
- [x] Remove plugin installation from install-project.ts
- [x] Update project-brief.md to document plugin architecture
- [x] Update focus.md to reflect user-level plugin installation
