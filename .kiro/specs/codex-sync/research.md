# Research & Design Decisions

---
**Purpose**: Capture discovery findings and rationale for the codex-sync feature.
---

## Summary
- **Feature**: `codex-sync`
- **Discovery Scope**: New Feature (greenfield script, integrating with two existing external tools)
- **Key Findings**:
  - MCP servers in Claude Code live in `~/.claude.json` (user) and `.mcp.json` (project), NOT `settings.json` — this corrects Requirement 6
  - Claude Code has standalone subagents at `~/.claude/agents/` and `.claude/agents/` in addition to plugin agents — Requirements 5.1/5.2 only mention plugin agents
  - No TOML or YAML frontmatter parsing libraries exist in the project; both are needed

## Research Log

### MCP Server Configuration Location
- **Context**: Requirements 6.1 and 6.2 specify reading MCP config from `settings.json`. Research found this is incorrect.
- **Sources Consulted**: [Claude Code settings docs](https://code.claude.com/docs/en/settings), [Claude Code MCP docs](https://code.claude.com/docs/en/mcp)
- **Findings**:
  - Claude Code MCP servers are in `~/.claude.json` (user scope) and `.mcp.json` (project scope)
  - Both use `{ "mcpServers": { "<name>": { "command": "...", "args": [...], "env": {...} } } }` format
  - `settings.json` contains permissions, hooks, env, plugin config — but NOT MCP servers
- **Implications**: Requirements 6.1/6.2 source paths need correction. Design uses the actual file locations.

### Claude Code Agent Sources
- **Context**: Requirements 5.1/5.2 only mention plugin agents. Research found additional agent sources.
- **Sources Consulted**: [Claude Code settings docs](https://code.claude.com/docs/en/settings)
- **Findings**:
  - Claude Code subagents exist at `~/.claude/agents/` (user) and `.claude/agents/` (project)
  - These are standalone .md files with YAML frontmatter (same format as plugin agents)
  - Plugin agents live in the plugin's `agents/` directory
- **Implications**: Design includes both standalone subagents and plugin agents.

### Codex CLI Configuration Structure
- **Context**: Needed to map Claude Code artifacts to Codex equivalents.
- **Sources Consulted**: [Codex skills docs](https://developers.openai.com/codex/skills), [Codex subagents docs](https://developers.openai.com/codex/subagents), [Codex config reference](https://developers.openai.com/codex/config-reference), [Codex config sample](https://developers.openai.com/codex/config-sample)
- **Findings**:
  - Skills: `.agents/skills/<name>/SKILL.md` — only `name` and `description` in frontmatter, unknown fields ignored
  - Agents: `.codex/agents/<name>.toml` — fields: `name`, `description`, `developer_instructions`, `model` (optional)
  - MCP: `config.toml` under `[mcp_servers.<id>]` — fields: `command`, `args`, `env`, `enabled`, timeouts
  - Instructions: `AGENTS.override.md` takes precedence over `AGENTS.md`
- **Implications**: Skill frontmatter stripping is safe (Codex ignores unknown fields anyway). Agent conversion requires .md-to-.toml format transformation. MCP needs JSON-to-TOML conversion with merge.

### Existing Codebase Patterns
- **Context**: How to integrate with existing `ai` CLI and TypeScript infrastructure.
- **Sources Consulted**: `typescript/scripts/ai.ts`, `typescript/lib/` modules
- **Findings**:
  - Commander.js with dependency injection (`InstallConfig`, `CommandExecutor`)
  - Zod schemas with `.passthrough()` for forward compatibility
  - Regex-based frontmatter parsing (doesn't handle multiline YAML values)
  - rsync-based file operations via `CommandExecutor`
  - No TOML or YAML libraries in current dependencies
- **Implications**: New dependencies needed (TOML library, YAML frontmatter parser). Follow existing DI and Zod patterns.

### TOML Library Selection
- **Context**: Need to parse existing config.toml and generate new TOML content.
- **Sources Consulted**: npm registry, Bun compatibility reports
- **Findings**:
  - `smol-toml`: Modern, ESM-native, zero dependencies, TypeScript types, small footprint, handles TOML v1.0
  - `@iarna/toml`: Well-established but older, CJS, larger
  - Manual TOML generation: Error-prone for multi-line strings (developer_instructions) and merging
- **Implications**: `smol-toml` is the right choice for Bun + TypeScript project.

### Frontmatter Parsing
- **Context**: Agent .md files have multiline YAML descriptions that the existing regex parser can't handle.
- **Sources Consulted**: Existing `config-audit-operations.ts`, agent .md file examples
- **Findings**:
  - `gray-matter`: Standard frontmatter parser, handles all YAML edge cases, widely used
  - Existing regex parser: Works for simple key-value pairs but fails on multiline values
  - Could use `js-yaml` directly with regex to extract the frontmatter block
- **Implications**: `gray-matter` is the cleanest solution. Single dependency that handles extraction + YAML parsing.

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Pipeline | Discover → Convert → Write with orchestrator | Simple linear flow, easy to test each stage | Less flexible for parallel operations | Best fit for sequential sync operations |
| Plugin-per-artifact | Separate sync module per artifact type | Maximum isolation | Over-engineered for 4 artifact types | YAGNI |

## Design Decisions

### Decision: Pipeline Architecture
- **Context**: Need to sync 4 artifact types (instructions, skills, agents, MCP) in sequence
- **Alternatives Considered**:
  1. Pipeline with shared orchestrator — single entry point, each artifact type has a converter
  2. Independent sync modules per artifact type — no shared orchestration
- **Selected Approach**: Pipeline with orchestrator. A `syncAll()` function calls `syncInstructions()`, `syncSkills()`, `syncAgents()`, `syncMcp()` in sequence. Each returns results to the orchestrator for final summary.
- **Rationale**: Simple, testable, follows existing patterns in the codebase
- **Trade-offs**: Sequential execution (fine for file I/O); easy to parallelize later if needed

### Decision: Use `gray-matter` + `smol-toml` Dependencies
- **Context**: Need YAML frontmatter parsing and TOML read/write
- **Alternatives Considered**:
  1. gray-matter + smol-toml — purpose-built libraries
  2. Manual parsing with regex — no dependencies but fragile
  3. js-yaml + @iarna/toml — heavier, CJS
- **Selected Approach**: gray-matter for frontmatter, smol-toml for TOML
- **Rationale**: Both are small, ESM-compatible, well-typed. Manual TOML generation for multi-line strings is error-prone.
- **Trade-offs**: Two new dependencies, but both are lightweight

### Decision: Correct MCP Source Files
- **Context**: Requirements 6.1/6.2 specify `settings.json` but MCP servers live elsewhere
- **Selected Approach**: Read from `~/.claude.json` (user) and `.mcp.json` (project) instead
- **Rationale**: These are the actual MCP configuration files per Claude Code documentation
- **Follow-up**: Requirements 6.1/6.2 should be updated to reflect correct paths

### Decision: Include Standalone Subagents
- **Context**: Requirements only mention plugin agents, but standalone subagents also exist
- **Selected Approach**: Discover agents from both plugin directories AND standalone agent directories (`~/.claude/agents/`, `.claude/agents/`)
- **Rationale**: Standalone subagents are a first-class Claude Code feature and should be included in sync
- **Follow-up**: Requirements 5.1/5.2 should be expanded

## Risks & Mitigations
- **Plugin cache structure changes** — Claude Code may change the internal plugin cache layout. Mitigation: Discovery uses `.claude-plugin/plugin.json` as anchor, not hardcoded paths.
- **TOML merge losing formatting** — Parse-modify-serialize cycle loses comments and formatting. Mitigation: Document this behavior; TOML libraries don't preserve comments.
- **Frontmatter format drift** — Claude Code or Codex may change frontmatter fields. Mitigation: Zod schemas with `.passthrough()` accept unknown fields gracefully.
- **Name collisions** — Multiple plugins could define skills/agents with the same name. Mitigation: Last-write-wins (matching overwrite requirement), log a warning.

## References
- [Claude Code Settings](https://code.claude.com/docs/en/settings) — Configuration scopes, MCP location, subagent paths
- [Claude Code MCP](https://code.claude.com/docs/en/mcp) — MCP server configuration format
- [Codex Skills](https://developers.openai.com/codex/skills) — SKILL.md format, discovery locations
- [Codex Subagents](https://developers.openai.com/codex/subagents) — Agent .toml format, configuration
- [Codex Config Reference](https://developers.openai.com/codex/config-reference) — config.toml structure
- [Codex Config Sample](https://developers.openai.com/codex/config-sample) — Example config.toml
- [Codex MCP](https://developers.openai.com/codex/mcp) — MCP server TOML format
