---
name: ai-validation-output
description: This skill should be used when the user wants to configure validation tools for AI-optimal output, set up a pre-commit hook or validation script for AI agents, optimize linter/test/typecheck output for Claude Code, reduce token waste from tool output, or configure CommandCenter.json for pre-merge validation. Also triggered by "set up AI validation", "optimize test output for AI", "configure eslint for claude", "reduce test output noise", or "set up pre-merge checks".
---

# AI-Optimal Validation Output

Configure validation tools (linters, type checkers, test runners) to produce output optimized for AI agent consumption. AI agents read every line of tool output, and each line consumes tokens. Default output is designed for human eyes — color codes, progress bars, per-file success messages — none of which helps an agent understand what's broken.

## Core Principles

1. **Suppress success output** — Passing tests and clean files are noise. Only failures matter.
2. **Preserve failure details** — Full error messages, file locations, expected/received values must remain intact.
3. **Strip ANSI color codes** — Escape sequences waste tokens and convey nothing to an LLM. Use `--no-color` or equivalent.
4. **Bail early** — Stop after a few failures. Cascading errors from one root cause waste context on symptoms.
5. **Truncate large diffs** — The agent can read source files directly; 5,000-character diffs are wasteful.
6. **Detect automatically** — Use environment variables, not manual flags. Claude Code sets `CLAUDECODE=1` in every spawned shell; CI systems set `CI=true`.

## Environment Detection

All tool configurations should use automatic detection:

```typescript
const isAI = process.env.CLAUDECODE === "1";
const isCI = process.env.CI === "true";
```

This is deterministic and preferable to relying on agent instructions or CLI flags.

## Quick Reference

| Tool | Human Command | AI Command | Key Difference |
|------|--------------|------------|----------------|
| ESLint | `eslint .` | `eslint . --quiet --no-color --no-warn-ignored` | Errors only, no colors |
| TypeScript | `tsc --noEmit --pretty` | `tsc --noEmit --pretty false` | One line per error, no source snippets |
| Vitest | `vitest run` (default reporter) | `vitest run --no-color` (dot reporter via config) | 1 char per test, full failure detail |
| Jest | `jest` (default reporter) | `jest --silent --no-color --bail=3` (summary reporter via config) | No per-file PASS lines |
| Prettier | `prettier --write .` | `prettier --write . > /dev/null 2>&1` | Suppress file list |

For detailed per-tool configuration including config file examples, output comparisons, and rationale, see **`references/tool-configurations.md`**.

## Command Center Integration

Projects managed by CC can configure a pre-merge validation script via `CommandCenter.json` in the project root:

```json
{
  "preMergeCommand": "scripts/pre-merge-validate.sh"
}
```

CC runs this script before squash-merging a session branch into main. The path can be relative (to the project root) or absolute.

### Execution Flow

1. CC commits any uncommitted changes in the session worktree
2. CC merges main into the session branch
3. CC runs the validation script in the session worktree
4. If the script auto-fixes files (Prettier/ESLint), CC commits them automatically
5. CC squash-merges the session branch into main

If the script exits non-zero, the merge is aborted and error output is surfaced to the user.

### Environment Variables Provided by CC

| Variable | Description |
|----------|-------------|
| `PROJECT_ROOT` | Absolute path to the project root |
| `WORKTREE_PATH` | Absolute path to the session worktree |
| `SESSION_NAME` | Session identifier |
| `BRANCH_NAME` | Git branch name |


Note: `CLAUDECODE=1` is set by Claude Code itself in every spawned shell — it is not injected by CC. The validation script inherits it from the shell environment.

### Example Pre-Merge Script

```bash
#!/usr/bin/env bash
set -euo pipefail

npx prettier --write .
npx eslint . --fix
npx tsc --noEmit --pretty
npx vitest run --project unit
```

The `set -euo pipefail` exits on first failure. The pre-merge script intentionally uses human-readable output since CC captures stderr/stdout for debugging failed merges. AI-optimal flags belong in pre-commit hooks and CI, where agents consume output in real time.

## Pre-Commit Hook Pattern

Branch on `CLAUDECODE` to switch between human and AI output modes:

```bash
#!/bin/sh
set -e

# Format and stage
npx prettier --write . > /dev/null 2>&1
git add -u

# Lint — AI mode suppresses warnings and colors
if [ "$CLAUDECODE" = "1" ]; then
  npx eslint . --fix --quiet --no-color --no-warn-ignored
else
  npx eslint . --fix
fi
git add -u

# Type check — AI mode uses one-line-per-error format
if [ "$CLAUDECODE" = "1" ]; then
  tsc --noEmit --pretty false
else
  tsc --noEmit --pretty
fi

# Tests — reporter switching handled in vitest/jest config
npx vitest run
```

## Package.json Scripts

Add dedicated `:ai` variants for tools that only accept CLI flags (ESLint, TypeScript). For test runners (Vitest/Jest), prefer automatic `CLAUDECODE` detection in the config file as shown in `references/tool-configurations.md` — the `:ai` script variants are a fallback for projects that cannot modify their test config.

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:ai": "eslint . --quiet --no-color --no-warn-ignored",
    "test": "vitest run",
    "test:ai": "vitest run --no-color",
    "typecheck": "tsc --noEmit --pretty",
    "typecheck:ai": "tsc --noEmit --pretty false",
    "check:ai": "eslint . --quiet --no-color --no-warn-ignored && tsc --noEmit --pretty false && vitest run --no-color"
  }
}
```

## Workflow

When a user asks to set up AI-optimal validation:

1. Determine which tools the project uses (check `package.json` for eslint, vitest, jest, typescript)
2. Check for existing `CommandCenter.json`, pre-commit hooks, and validation scripts
3. Apply the appropriate configuration from the quick reference table and **`references/tool-configurations.md`**
4. For test runners (Vitest/Jest), modify the config file for automatic `CLAUDECODE` detection
5. For CLI tools (ESLint, TypeScript), modify pre-commit hooks and/or create `:ai` script variants
6. If the project is managed by CC, ensure `CommandCenter.json` has `preMergeCommand` configured

## Additional Resources

### Reference Files

- **`references/tool-configurations.md`** — Detailed per-tool configuration with config file examples, output comparisons, flag explanations, and rationale for each recommendation
