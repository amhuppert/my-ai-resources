# Standardize Memory Implementation Plan

## Overview

Migrate from the legacy memory-bank/document-map system to Kiro SDD steering files. Create `.kiro/steering/` with `product.md`, `tech.md`, and `structure.md`. Keep `memory-bank/focus.md` for session tracking. Remove deprecated tooling: memory-bank-plugin (entire plugin), document-map generation (CLI + skill + template), and the `/update-project-brief` and `/init-document-map` slash commands. Update all references across ~47 files. Remove the `memory-bank.mdc` Cursor rule.

---

## Phase 1: Create Kiro Steering Files

Create the `.kiro/steering/` directory. Add three core files with Kiro-standard frontmatter.

### `.kiro/steering/product.md`

```markdown
---
inclusion: always
---

# Product Overview

Centralized AI workflow resources for consistent tooling across development environments. Provides a complete ecosystem for AI-assisted development: Claude Code custom slash commands, Cursor IDE workflow rules, MCP servers for tool integration, and TypeScript-based configuration management.

Operates as a "meta-repository" that installs AI development infrastructure to both user-level directories (for use across all projects) and project-level directories (for team-specific workflows). Bridges multiple AI tools (Claude Code, Cursor) with a unified set of commands, documentation standards, and workflow patterns.

## Core Capabilities

- **Plugin-Based Slash Commands**: Extensible skill system for Claude Code with AI-aware git commits, code review, design workflows, and more
- **Cross-IDE Configuration**: Synchronized rules and commands for both Claude Code and Cursor IDE
- **TypeScript CLI Tooling**: Installation management, settings validation, and utility scripts compiled to standalone executables
- **MCP Server Integration**: Tool integration via Model Context Protocol (keyboard shortcuts, library docs)

## Target Use Cases

- Automating git workflows with AI-aware commits
- Managing persistent project context across AI sessions via steering files
- Generating keyboard shortcuts with AI recommendations
- Optimizing AI instructions for token efficiency
- Standardizing AI development workflows across multiple projects

## Value Proposition

Single source of truth for AI development tooling that installs consistently across projects. Eliminates manual setup of AI tool configurations and ensures team-wide consistency in AI-assisted development patterns.
```

### `.kiro/steering/tech.md`

```markdown
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
```

### `.kiro/steering/structure.md`

```markdown
---
inclusion: always
---

# Project Structure

## Organization Philosophy

Feature-grouped directories at the top level, with shared TypeScript tooling compiled by Bun. Installation splits between user-level (home directory) and project-level (current directory) targets. AI tool configurations (Claude Code, Cursor) live in their own directories, compiled and installed separately.

## Directory Patterns

### `claude/` - Claude Code Plugin Source
Plugin definitions with standardized internal structure. Each plugin contains:
- `.claude-plugin/plugin.json` - Plugin manifest
- `skills/<skill-name>/SKILL.md` - Skill definitions
- `hooks/` - Event-driven shell scripts (optional)
- `agents/` - Agent definitions (optional)
- `scripts/` - Supporting TypeScript utilities (optional)

Primary plugin: `ai-resources-plugin/` (installed via `claude` CLI plugin system).

### `cursor/` - Cursor IDE Configuration Source
Rules (`.mdc` files with YAML frontmatter) and commands installed to target projects' `.cursor/` directory.

### `agent-docs/` - AI Agent Reference Documentation
Markdown reference docs installed to `~/.claude/agent-docs/`. Includes code standards, workflow documentation, and tool references.

### `typescript/` - Core TypeScript Tooling
Library code (`lib/`) and CLI scripts (`scripts/`) compiled to standalone executables in `dist/`. Entry point: `scripts/ai.ts` providing the `ai` CLI.

### `scripts/` - Shell Utilities
Standalone bash scripts installed to `~/.local/bin/`. Self-contained, no build step required.

### `cursor-shortcuts-mcp/` - MCP Server
TypeScript MCP server compiled to `bin/` and globally linked via `bun link`.

### `memory-bank/` - Session Tracking
Contains `focus.md` (gitignored) for tracking current work-in-progress across AI sessions.

### `.kiro/steering/` - Project Context
Kiro SDD steering files providing persistent project context for AI agents.

## Naming Conventions

- **Files**: kebab-case (`install-user.ts`, `setup-worktree`)
- **TypeScript**: camelCase functions, PascalCase types/Zod schemas
- **Skills**: `namespace:kebab-case` (`ai-resources:commit`)
- **CLI commands**: kebab-case subcommands (`ai install`, `ai worktree`)

## Key Interfaces

### Installation Pipeline
- `typescript/lib/installer-utils.ts` - File sync, CLAUDE.md merging with comment markers
- `typescript/scripts/install-user.ts` - User-level installation (home directory)
- `typescript/scripts/install-project.ts` - Project-level installation (current directory)

### Settings Management
- `typescript/lib/claude-code-settings.ts` - Zod schemas for Claude Code settings validation

### CLAUDE.md Template
- `claude/CLAUDE-project.md` - Standard instructions template merged between `<!-- Begin standard instructions -->` / `<!-- End of standard instructions -->` comment markers
```

---

## Phase 2: Update CLAUDE.md Files

### 2a. `CLAUDE.md` — Project-Level Instructions Block

Inside `<project-level-instructions>`, make these replacements:

**Replace the Document Map and Memory Bank sections:**

```
## Document Map

@document-map.md

## Memory Bank

The memory bank is a set of files with critical context. It gives Claude a persistent memory.

Files:

- @memory-bank/project-brief.md - Project brief (high-level overview, tech stack, key architectural decisions, and important commands)
- @memory-bank/focus.md - Current focus: work-in-progress, progress, remaining tasks
```

**With:**

```
## Steering Context

@.kiro/steering/product.md
@.kiro/steering/tech.md
@.kiro/steering/structure.md

## Session Focus

- @memory-bank/focus.md - Current focus: work-in-progress, progress, remaining tasks
```

**Remove this entry from the `## Project Rules` → `### Meta` subsection:**

```
- **.cursor/rules/meta/memory-bank.mdc**: This rule should be used always (alwaysApply: true) when working with memory bank files to maintain project context across AI sessions. Requires reading all memory bank files at task start and updating focus.md when completing tasks.
```

### 2b. `CLAUDE.md` — Standard Instructions Section

Between the `<!-- Begin standard instructions -->` and `<!-- End of standard instructions -->` markers:

**Replace:**

```
## Document Map

See @document-map.md to understand key files and how to navigate the codebase.

## Memory Bank

Persistent memory across sessions via markdown files.

- @memory-bank/project-brief.md - High-level overview, tech stack, key decisions
- @memory-bank/focus.md - Current work-in-progress and remaining tasks
```

**With:**

```
## Steering Context

Project context via Kiro steering files in `.kiro/steering/`.

- @.kiro/steering/product.md - Product vision and use cases
- @.kiro/steering/tech.md - Tech stack, architecture, key commands
- @.kiro/steering/structure.md - Codebase structure and conventions

## Session Focus

- @memory-bank/focus.md - Current work-in-progress and remaining tasks
```

### 2c. `claude/CLAUDE-project.md`

Apply the exact same replacement as 2b (standard instructions). This file is the template source — its content must match what appears between the comment markers in CLAUDE.md.

---

## Phase 3: Update Reference Files

### 3a. `README.md`

**Replace** the `memory-bank/` line in the File Structure list:
```
- `memory-bank/` - Persistent context files (project-brief.md, focus.md) for AI memory
```
**With:**
```
- `memory-bank/` - Session tracking (focus.md) for AI-assisted development
```

**Replace** the `typescript/` line:
```
- `typescript/` - TypeScript tooling for installation, settings management, and document map generation
```
**With:**
```
- `typescript/` - TypeScript tooling for installation and settings management
```

**Add** after the `memory-bank/` line:
```
- `.kiro/` - Kiro SDD steering files for project context
```

### 3b. `scripts/setup-worktree`

**Remove** this line from the memory-bank copying block:
```bash
  copy_file_if_exists "$ROOT_WORKTREE_PATH/memory-bank/project-brief.md" "$WORKTREE_DIR/memory-bank/" "memory-bank/project-brief.md"
```

Keep the `mkdir -p` for `memory-bank` and the `focus.md` copy line.

### 3c. `voice-context.md`

In the `## Terminology` section:

**Remove** these entries:
```
- **memory-bank** - Persistent context system for AI sessions using markdown files and SQLite
- **project-brief.md** - Memory bank file with high-level project overview
- **document-map.md** - Navigation aid file listing important files and their purposes
```

**Replace** this entry:
```
- **focus.md** - Memory bank file tracking current work-in-progress
```
**With:**
```
- **focus.md** - Session file tracking current work-in-progress
```

**Add** this entry (alphabetical placement near "steering"):
```
- **steering files** - Kiro SDD project context files in .kiro/steering/ (product.md, tech.md, structure.md)
```

**Update** the `**ai**` entry — remove the `ai init-document-map` reference from its description.

In the `## Claude Commands & Skills` → `### ai-resources Plugin Skills` section:

**Remove** these two entries:
```
- **/ai-resources:init-document-map** - Generate a document map for codebase navigation
- **/ai-resources:update-project-brief** - Update the memory-bank project brief
```

**Remove** the entire `### memory-bank Plugin Skills` subsection (all 7 entries).

### 3d. `voice-vocabulary.md`

**Remove** these entries:
```
document-map.md
memory-bank
project-brief.md
memory-bank-plugin
memory-bank-mcp
/ai-resources:init-document-map
/ai-resources:update-project-brief
/memory-bank:add-feature
/memory-bank:complete-objective
/memory-bank:mb-quick-add
/memory-bank:mb-status
/memory-bank:memory-context
/memory-bank:start-objective
/memory-bank:sync-memory-bank
```

**Add** these entries (maintain alphabetical order):
```
steering files
```

### 3e. Check & Update: `.cursor/commands/_init-ralph-task.md`

Read this file. If it references `memory-bank` as a concept (beyond `memory-bank/focus.md` path), update the language. The `memory-bank/focus.md` path reference is still valid and should remain.

### 3f. Check & Update: `claude/ai-resources-plugin/skills/jog-users-memory/SKILL.md`

Read this file. If it references "memory bank" broadly, update to reference steering context. Keep the `memory-bank/focus.md` path reference since focus.md stays.

### 3g. Check & Update: `claude/ai-resources-plugin/skills/save-current-context/SKILL.md`

Read this file. If it references memory-bank or document-map concepts, update accordingly.

### 3h. `document-map.md` (Project Root)

This file is deleted in Phase 5. No modifications needed — just ensure CLAUDE.md references are updated first (Phase 2).

---

## Phase 4: Update TypeScript CLI

### 4a. `typescript/scripts/ai.ts`

**Remove** the entire `init-document-map` command block (the `program.command("init-document-map")` chain with its `.description()`, `.option()`, and `.action()` handler). This is approximately lines 63–140 of the current file.

No top-level imports need removal — the handler uses only dynamic imports.

### 4b. Check: `typescript/package.json`

Verify if there is a script entry for `init-document-map`. If so, remove it.

---

## Phase 5: Remove Deprecated Files & Directories

### Directories (delete recursively)

| Path | Reason |
|------|--------|
| `claude/memory-bank-plugin/` | Entire plugin deprecated |
| `claude/ai-resources-plugin/skills/init-document-map/` | Slash command removed |
| `claude/ai-resources-plugin/skills/update-project-brief/` | Slash command removed |

### Files

| Path | Reason |
|------|--------|
| `memory-bank/project-brief.md` | Content migrated to `.kiro/steering/` |
| `document-map.md` | Content migrated to `.kiro/steering/structure.md` |
| `.cursor/rules/meta/memory-bank.mdc` | Cursor rule deprecated |
| `cursor/rules/meta/memory-bank.mdc` | Source copy of deprecated rule |
| `agent-docs/document-map-format.md` | Document-map feature removed |
| `agent-docs/document-map-template.md` | Document-map feature removed |
| `typescript/scripts/init-document-map.ts` | CLI script removed |
| `typescript/templates/init-document-map.eta` | Template removed |

### Additional Cleanup Check

Check if `claude/plugin/resources/` contains `document-map-format.md` or `document-map-template.md`. If present, remove them. The init-document-map CLI handler referenced this path.

---

## Phase 6: Build & Verify

### 6a. Rebuild TypeScript

```bash
cd typescript && bun run build
```

Verify the build succeeds. The removal of `init-document-map.ts` and the command handler from `ai.ts` should not cause build failures since no other files import from them.

### 6b. Verify No Broken References

Run a grep for remaining references to catch anything missed:

```bash
# Should return ONLY memory-bank/focus.md references and this plan file
grep -r "memory-bank" --include="*.md" --include="*.ts" --include="*.sh" --include="*.mdc" .

# Should return NO results (other than this plan file)
grep -r "project-brief" --include="*.md" --include="*.ts" --include="*.sh" --include="*.mdc" .

# Should return NO results (other than this plan file and git history)
grep -r "document-map" --include="*.md" --include="*.ts" --include="*.sh" --include="*.mdc" .

# Should return NO results
grep -r "memory-bank-plugin" --include="*.md" --include="*.ts" .
```

### 6c. Verify Steering Files Load

Confirm `.kiro/steering/` files are not in `.gitignore` and will be tracked by git.

### 6d. Verify CLI

```bash
ai --help
```

Confirm `init-document-map` no longer appears in the help output.

---

## Complete File Manifest

### CREATE (3 files)
| File | Source |
|------|--------|
| `.kiro/steering/product.md` | Adapted from `memory-bank/project-brief.md` Overview |
| `.kiro/steering/tech.md` | Adapted from `memory-bank/project-brief.md` Tech Stack + Architecture + Commands |
| `.kiro/steering/structure.md` | Adapted from `document-map.md` (rewritten to pattern-focused per Kiro conventions) |

### MODIFY (9+ files)
| File | Changes |
|------|---------|
| `CLAUDE.md` | Replace Document Map + Memory Bank sections with Steering Context + Session Focus; remove memory-bank.mdc from Project Rules |
| `claude/CLAUDE-project.md` | Replace Document Map + Memory Bank sections with Steering Context + Session Focus |
| `README.md` | Update memory-bank/ and typescript/ descriptions; add .kiro/ entry |
| `scripts/setup-worktree` | Remove project-brief.md copy line |
| `voice-context.md` | Remove legacy terms, update focus.md description, add steering files term, remove deprecated skills |
| `voice-vocabulary.md` | Remove 14 legacy entries, add steering files |
| `typescript/scripts/ai.ts` | Remove init-document-map command (~77 lines) |
| `.cursor/commands/_init-ralph-task.md` | Check and update if needed |
| `claude/ai-resources-plugin/skills/jog-users-memory/SKILL.md` | Check and update if needed |
| `claude/ai-resources-plugin/skills/save-current-context/SKILL.md` | Check and update if needed |

### DELETE (8 files + 3 directories)
| Path | Type |
|------|------|
| `claude/memory-bank-plugin/` | Directory (entire plugin) |
| `claude/ai-resources-plugin/skills/init-document-map/` | Directory |
| `claude/ai-resources-plugin/skills/update-project-brief/` | Directory |
| `memory-bank/project-brief.md` | File |
| `document-map.md` | File |
| `.cursor/rules/meta/memory-bank.mdc` | File |
| `cursor/rules/meta/memory-bank.mdc` | File |
| `agent-docs/document-map-format.md` | File |
| `agent-docs/document-map-template.md` | File |
| `typescript/scripts/init-document-map.ts` | File |
| `typescript/templates/init-document-map.eta` | File |

---

## Implementation Order

Execute phases in order (1 → 6). Within each phase, steps can be done in any order except:
- Phase 2 (update references) must complete before Phase 5 (delete files) to avoid broken `@` references during transition
- Phase 4 (TypeScript CLI) should complete before Phase 6a (rebuild)

---

## Post-Migration Notes

- **Plugin cache**: After removing `memory-bank-plugin/` source, any installed instances in other projects will need manual uninstallation via `claude mcp remove` or equivalent
- **Eta dependency**: After removing init-document-map, verify if `eta` is still used elsewhere in the TypeScript project. If not, consider removing the dependency as a follow-up
- **CC-SDD installation**: The `.kiro/steering/` files are now compatible with `npx cc-sdd@latest --claude` for future steering sync operations
- **`/kiro:steering` command**: The `ai-resources:steer` skill references `/kiro:steering` for persisting insights. Verify this command is available via CC-SDD installation
