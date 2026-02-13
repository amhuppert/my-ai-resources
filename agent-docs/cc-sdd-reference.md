# cc-sdd (Claude Code Spec-Driven Development) Reference Guide for AI Agents

<Overview>
cc-sdd is a CLI tool that installs spec-driven development (SDD) workflows into AI coding agent environments. It generates slash commands, templates, rules, and project-memory documents for 8 AI coding platforms. The core workflow follows a structured lifecycle: steering (project memory) → spec-init → requirements → design → tasks → implementation.
</Overview>

## Installation & Setup

```bash
# Install into current project (interactive)
npx cc-sdd@latest

# Install with specific agent
npx cc-sdd@latest --claude          # Claude Code
npx cc-sdd@latest --claude-agent    # Claude Code with subagents
npx cc-sdd@latest --cursor          # Cursor IDE
npx cc-sdd@latest --gemini          # Gemini CLI
npx cc-sdd@latest --codex           # Codex CLI
npx cc-sdd@latest --copilot         # GitHub Copilot
npx cc-sdd@latest --qwen            # Qwen Code
npx cc-sdd@latest --opencode        # OpenCode
npx cc-sdd@latest --opencode-agent  # OpenCode with subagents
npx cc-sdd@latest --windsurf        # Windsurf IDE

# Non-interactive with options
npx cc-sdd@latest --claude --lang ja --overwrite force --yes

# Dry run (preview without writing)
npx cc-sdd@latest --claude --dry-run
```

**Prerequisites**: Node.js (no runtime dependencies)

**Current version**: 2.1.1

## Core Concepts

- **SDD (Spec-Driven Development)**: Structured methodology where features flow through requirements → design → tasks → implementation phases before any code is written
- **AI-DLC (AI-Driven Development Lifecycle)**: The overall lifecycle combining SDD with AI agents. Inspired by [Kiro IDE](https://kiro.dev)
- **Steering**: Persistent project-memory documents (`product.md`, `tech.md`, `structure.md`) that give the AI context about the project across sessions
- **Specs**: Feature specifications stored in `.kiro/specs/<feature-name>/` containing `spec.json`, `requirements.md`, `design.md`, `research.md`, and `tasks.md`
- **EARS format**: Requirements syntax using patterns like `WHEN [event] THEN [system] SHALL [action]`
- **Parallel markers**: Tasks tagged with `(P0)`, `(P1)`, `(P2)` indicating dependency waves for concurrent implementation
- **Manifests**: JSON files defining what files get installed for each agent, with conditional logic and template rendering

## CLI Reference

```bash
npx cc-sdd@latest [options]
```

| Flag                   | Description                                | Default          |
| ---------------------- | ------------------------------------------ | ---------------- |
| `--agent <name>`       | AI agent type                              | `claude-code`    |
| `--lang <code>`        | Language code                              | `en`             |
| `--os <type>`          | Target OS (`auto`/`mac`/`windows`/`linux`) | `auto`           |
| `--kiro-dir <path>`    | Kiro directory path                        | `.kiro`          |
| `--overwrite <policy>` | `prompt`/`skip`/`force`                    | `prompt`         |
| `--backup[=<dir>]`     | Enable backup                              | `.cc-sdd.backup` |
| `--profile <type>`     | `full`/`minimal`                           | `full`           |
| `--manifest <path>`    | Custom manifest path                       | —                |
| `--dry-run`            | Preview without writing                    | `false`          |
| `--yes, -y`            | Skip interactive prompts                   | `false`          |

**Agent alias flags**: `--claude`, `--claude-agent`, `--cursor`, `--gemini`, `--codex`, `--copilot`, `--qwen`, `--opencode`, `--opencode-agent`, `--windsurf`

**Supported languages** (13): `en`, `ja`, `zh-TW`, `zh`, `es`, `pt`, `de`, `fr`, `ru`, `it`, `ko`, `ar`, `el`

**Exit codes**: `0` = success, `1` = error

## Installed Slash Commands

After installation, these slash commands become available (command prefix varies by agent):

### Steering Commands (Project Memory)

| Command                 | Purpose                                                                         |
| ----------------------- | ------------------------------------------------------------------------------- |
| `/kiro:steering`        | Create/update project memory (`product.md`, `tech.md`, `structure.md`)          |
| `/kiro:steering-custom` | Add domain-specific steering documents (API standards, testing, security, etc.) |

### Spec Workflow Commands

| Command                                | Purpose                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `/kiro:spec-init <description>`        | Initialize a new feature specification                             |
| `/kiro:spec-requirements <feature>`    | Generate EARS-format requirements (AI asks clarifying questions)   |
| `/kiro:spec-design <feature> [-y]`     | Create technical design (optionally generates `research.md` first) |
| `/kiro:spec-tasks <feature> [-y]`      | Break design into implementation tasks with parallel markers       |
| `/kiro:spec-impl <feature> [task-ids]` | Execute implementation with TDD approach                           |
| `/kiro:spec-status <feature>`          | Check feature progress across all phases                           |

### Validation Commands (Brownfield)

| Command                                 | Purpose                                          |
| --------------------------------------- | ------------------------------------------------ |
| `/kiro:validate-gap <feature>`          | Analyze implementation gap vs requirements       |
| `/kiro:validate-design <feature>`       | Validate design compatibility with existing code |
| `/kiro:validate-impl [feature] [tasks]` | Validate implementation quality                  |

### Subagent-Only Command (claude-agent, opencode-agent)

| Command                          | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `/kiro:spec-quick <description>` | Orchestrated workflow through all spec phases via subagents |

## Installed Directory Structure

After `npx cc-sdd@latest --claude`:

```
project/
├── .claude/commands/kiro/          # 11 slash commands
├── .kiro/
│   ├── settings/
│   │   ├── rules/                  # AI generation rules
│   │   │   ├── ears-format.md
│   │   │   ├── design-principles.md
│   │   │   ├── tasks-generation.md
│   │   │   ├── tasks-parallel-analysis.md
│   │   │   └── steering-principles.md
│   │   └── templates/              # Document templates
│   │       ├── specs/              # Spec phase templates
│   │       ├── steering/           # Steering document templates
│   │       └── steering-custom/    # Custom steering templates
│   ├── specs/                      # Feature specifications (created per-feature)
│   └── steering/                   # Project memory (created by /kiro:steering)
├── CLAUDE.md                       # Project documentation with SDD instructions
```

**Agent-specific directories** vary:

- Claude Code: `.claude/commands/kiro/`
- Claude Code Agents: `.claude/commands/kiro/` + `.claude/agents/kiro/` (9 subagents)
- Cursor: `.cursor/commands/kiro/`
- Gemini: `.gemini/commands/kiro/`
- Codex: `.codex/prompts/`
- GitHub Copilot: `.github/prompts/`
- Qwen: `.qwen/commands/kiro/`
- OpenCode: `.opencode/commands/`
- Windsurf: `.windsurf/workflows/`

## Spec Workflow

### Greenfield (New Project)

```bash
# 1. Create project memory (optional but recommended)
/kiro:steering

# 2. Initialize feature
/kiro:spec-init Build user authentication with OAuth

# 3. Generate requirements (AI asks clarifying questions first)
/kiro:spec-requirements auth-system

# 4. Create technical design
/kiro:spec-design auth-system

# 5. Break into parallelizable tasks
/kiro:spec-tasks auth-system

# 6. Implement (all tasks or specific ones)
/kiro:spec-impl auth-system
/kiro:spec-impl auth-system 1.1 1.2
```

### Brownfield (Existing Project)

```bash
# 1. MUST create project memory from existing codebase first
/kiro:steering

# 2-5. Same as greenfield...

# Extra: Use validation commands between phases
/kiro:validate-gap oauth-enhancement       # After requirements
/kiro:validate-design oauth-enhancement    # After design
/kiro:validate-impl oauth-enhancement      # After implementation
```

### Spec JSON (Phase Tracking)

Each feature has `.kiro/specs/<feature>/spec.json`:

```json
{
  "feature_name": "auth-system",
  "created_at": "2025-09-07T10:00:00Z",
  "updated_at": "2025-09-07T10:15:00Z",
  "language": "en",
  "phase": "tasks-generated",
  "approvals": {
    "requirements": { "generated": true, "approved": true },
    "design": { "generated": true, "approved": true },
    "tasks": { "generated": true, "approved": false }
  },
  "ready_for_implementation": false
}
```

## EARS Requirements Format

Requirements use EARS (Easy Approach to Requirements Syntax) patterns:

| Pattern      | Example                                                               |
| ------------ | --------------------------------------------------------------------- |
| Event-driven | `WHEN user clicks login THEN system SHALL redirect to OAuth provider` |
| Conditional  | `IF session expired THEN system SHALL prompt re-authentication`       |
| State-driven | `WHILE uploading THE system SHALL display progress indicator`         |
| Feature      | `WHERE admin panel THE system SHALL show user management`             |
| Ubiquitous   | `THE system SHALL encrypt all passwords with bcrypt`                  |

## Parallel Task Markers

Tasks are automatically tagged with dependency waves:

- `(P0)` — First wave, no dependencies (can start immediately)
- `(P1)` — Second wave, depends on P0 completion
- `(P2)` — Third wave, depends on P1 completion

```markdown
## Tasks

- [ ] 1. Authentication module (P0)
  - [ ] 1.1 Create user model (P0)
  - [ ] 1.2 Set up OAuth provider config (P0)
  - [ ] 1.3 Implement login flow (P1)
    - _Requirements: 1, 2_
  - [ ] 1.4 Add session management (P1)
  - [ ] 1.5 Integration tests (P2)
```

## Customization

### Templates vs Rules

- **Templates** (`.kiro/settings/templates/`): Define document structure and sections. AI fills content according to the template format.
- **Rules** (`.kiro/settings/rules/`): Define AI generation principles, quality criteria, and format standards.

Both are fully editable after installation.

### Required Structure Elements

| File              | Must Preserve                                                           | Reason                        |
| ----------------- | ----------------------------------------------------------------------- | ----------------------------- |
| `requirements.md` | Numbered criteria (`1.`, `2.`), EARS patterns                           | Commands parse this structure |
| `tasks.md`        | `- [ ] N.` checkboxes, `_Requirements: X_` refs, hierarchical numbering | Task engine parsing           |
| `design.md`       | File existence                                                          | Commands read it              |

### Custom Steering

Add domain-specific steering via `/kiro:steering-custom` or manually create files in `.kiro/steering/custom/`:

- `api-standards.md` — REST/GraphQL conventions
- `testing.md` — Test strategies
- `security.md` — Auth patterns
- `database.md` — Schema conventions
- `accessibility.md`, `performance.md`, `i18n.md`

## Agent Support Matrix

| Agent              | Flag               | Commands | Subagents | Doc File    |
| ------------------ | ------------------ | -------- | --------- | ----------- |
| Claude Code        | `--claude`         | 11       | No        | `CLAUDE.md` |
| Claude Code Agents | `--claude-agent`   | 12       | 9         | `CLAUDE.md` |
| Cursor             | `--cursor`         | 11       | No        | `AGENTS.md` |
| Gemini CLI         | `--gemini`         | 11       | No        | `GEMINI.md` |
| Codex CLI          | `--codex`          | 11       | No        | `AGENTS.md` |
| GitHub Copilot     | `--copilot`        | 11       | No        | `AGENTS.md` |
| Qwen Code          | `--qwen`           | 11       | No        | `QWEN.md`   |
| OpenCode           | `--opencode`       | 11       | No        | `AGENTS.md` |
| OpenCode Agents    | `--opencode-agent` | 12       | 9         | `AGENTS.md` |
| Windsurf           | `--windsurf`       | 11       | No        | `AGENTS.md` |

## Programmatic API

```typescript
import { runCli } from 'cc-sdd';

// Execute CLI programmatically
const exitCode: number = await runCli(
  argv: string[],         // CLI arguments
  runtime?: EnvRuntime,   // Optional runtime overrides
  io?: CliIO,             // Optional I/O abstraction
  loadedConfig?: UserConfig,
  execOpts?: { cwd?: string; templatesRoot?: string }
);
```

### Key Types

```typescript
type AgentType =
  | "claude-code"
  | "claude-code-agent"
  | "cursor"
  | "gemini-cli"
  | "codex-cli"
  | "github-copilot"
  | "qwen-code"
  | "opencode"
  | "opencode-agent"
  | "windsurf";

type SupportedLanguage =
  | "en"
  | "ja"
  | "zh-TW"
  | "zh"
  | "es"
  | "pt"
  | "de"
  | "fr"
  | "ru"
  | "it"
  | "ko"
  | "ar"
  | "el";

type UserConfig = {
  version?: number;
  agent?: AgentType;
  os?: "auto" | "mac" | "windows" | "linux";
  lang?: SupportedLanguage;
  kiroDir?: string;
  overwrite?: "prompt" | "skip" | "force";
  backupDir?: string;
  agentLayouts?: Partial<Record<AgentType, Partial<AgentLayout>>>;
};

// Template variables available in .tpl.md files
type TemplateContext = {
  LANG_CODE: string; // e.g., "en"
  DEV_GUIDELINES: string; // Language-specific dev guidelines
  KIRO_DIR: string; // e.g., ".kiro"
  AGENT_DIR: string; // e.g., ".claude"
  AGENT_DOC: string; // e.g., "CLAUDE.md"
  AGENT_COMMANDS_DIR: string; // e.g., ".claude/commands/kiro"
};
```

## Architecture

### Template System

- `.tpl.md` files are rendered with `{{VARIABLE}}` substitution → output as `.md`
- `.tpl.json` → `.json`, `.tpl.toml` → `.toml`
- Non-template files copied as-is
- Variables resolved at install time from `TemplateContext`

### Manifest System

JSON manifests define installation artifacts:

```json
{
  "version": 1,
  "artifacts": [
    {
      "id": "commands",
      "source": {
        "type": "templateDir",
        "fromDir": "templates/agents/{{AGENT}}/commands",
        "toDir": "{{AGENT_COMMANDS_DIR}}"
      },
      "when": { "agent": "claude-code" }
    }
  ]
}
```

**Artifact source types**: `staticDir` (copy as-is), `templateFile` (render single file), `templateDir` (render directory)

### Conflict Resolution

1. File exists → check `overwrite` policy
2. `prompt` → ask user (skip/overwrite/append per-file or per-category)
3. `skip` → never overwrite
4. `force` → always overwrite
5. `append` mode available for project-memory files (CLAUDE.md, AGENTS.md)

### Backup

- Optional via `--backup[=<dir>]`
- Preserves directory structure in backup folder
- Runs before any overwrite

## Project Source Structure

```
tools/cc-sdd/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── index.ts            # runCli() export
│   ├── cli/                # Arg parsing, config, I/O
│   ├── agents/             # Agent definitions registry
│   ├── manifest/           # JSON manifest loading/processing
│   ├── plan/               # File operation planning and execution
│   ├── template/           # Template context and rendering
│   ├── resolvers/          # Config value resolution (OS, paths, layouts)
│   ├── constants/          # Language constants
│   └── utils/              # Utility functions
├── templates/
│   ├── agents/             # Per-agent command templates
│   ├── manifests/          # Installation manifest JSON files
│   └── shared/             # Shared settings, rules, templates
├── test/                   # Vitest test suite
└── package.json
```

## Troubleshooting

- **"Unknown agent" error**: Use one of the supported agent flags or `--agent <name>` with a valid agent type
- **Kiro directory validation fails**: Path must be relative (no absolute paths), no parent traversal (`..`), no leading slash
- **Non-interactive environment**: Falls back to `skip` policy when TTY is unavailable. Use `--yes` with `--overwrite force` for CI
- **Template variables not rendered**: Ensure files use `.tpl.md` extension. Plain `.md` files are copied as-is
- **Stale commands after update**: Re-run `npx cc-sdd@latest` with `--overwrite force` to refresh all files
