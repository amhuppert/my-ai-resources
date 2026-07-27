---
name: ai-readable-tool-output
description: "Covers configuring development tooling — linters, type checkers,
  test runners, formatters — so AI agents can consume their output efficiently:
  suppress success output, preserve every failure detail, strip colors, bail
  early, and truncate huge diffs. Includes tool-by-tool flags and config for
  ESLint, TypeScript, Vitest, Jest, and Prettier, the `:ai` package script
  convention, and a backend-neutral `AI_OUTPUT=1` switch. Use when an agent
  burns context on passing-test noise, when setting up pre-commit hooks or
  agent-invoked check commands, when asked to \"make the test output quieter for
  the agent\", or when configuring a project's lint/typecheck/test scripts for
  agent use."
---

# AI-Readable Tool Output

AI agents read every line of tool output, and every line costs context. Default tool output is designed for human eyes scanning a terminal — color codes, progress bars, verbose per-file success messages — none of which helps an agent understand what is broken. A 200-test suite in default mode produces roughly 250 lines; in AI-optimal mode the same passing suite produces about 10 characters. The goal is simple: **maximize signal, minimize noise** — show every failure in full detail, suppress everything else.

## Core principles

1. **Suppress success output.** Passing tests and clean files are noise. The agent only needs to know about failures.
2. **Preserve failure details.** Full error messages, file locations, expected/received values, and relevant stack frames must stay intact. This is not about producing less output — it is about producing less *useless* output.
3. **Strip ANSI color codes.** Escape sequences like `\e[31m` waste tokens and convey nothing to a language model. Use `--no-color` or the tool's equivalent.
4. **Bail early.** After a few failures, stop. Cascading errors from a single root cause spend context on symptoms rather than the cause.
5. **Truncate large diffs.** A 5,000-character snapshot diff burns tokens without helping an agent that can read the source file directly.
6. **Use a backend-neutral opt-in signal.** Expose an explicit project-owned `AI_OUTPUT=1` switch, and let provider- or CI-specific signals opt into it. Claude Code sets `CLAUDECODE=1`; CI systems commonly set `CI=true`; other agent environments guarantee neither. The project owns the contract; vendor variables are conveniences that map onto it.

## Environment detection

Put this at the top of any config that needs to switch modes:

```typescript
const isAI =
  process.env.AI_OUTPUT === "1" || process.env.CLAUDECODE === "1";
const isCI = process.env.CI === "true";
```

| Variable | Set by | Value |
|---|---|---|
| `AI_OUTPUT` | Project script, agent, or operator | `"1"` to request backend-neutral low-noise output |
| `CLAUDECODE` | Claude Code | `"1"` in every spawned shell |
| `CI` | GitHub Actions, GitLab CI, CircleCI, etc. | `"true"` |

Use `AI_OUTPUT=1` when invoking a dedicated `:ai` script from an environment that provides no stable agent variable. Detection stays deterministic without coupling the project's contract to one vendor.

## ESLint

```bash
eslint . --quiet --no-color --no-warn-ignored
```

| Flag | What it does |
|---|---|
| `--quiet` | Report errors only, suppress warnings. In ESLint v9+, warning-level rules don't even execute, which also improves performance. |
| `--no-color` | Disable ANSI color codes. |
| `--no-warn-ignored` | Suppress "File ignored because of a matching ignore pattern" messages. |

**Keep the default `stylish` formatter.** It groups errors by file — the path appears once as a header with errors listed beneath — which is more token-efficient than `compact` or `unix`, both of which repeat the full file path on every line. The `json` formatter adds roughly 3-5x token overhead from structural keys (`"filePath"`, `"ruleId"`, `"severity"`) for minimal benefit; a model parses the tabular `stylish` output fine.

Example AI-mode output:

```
src/lib/prompt.ts
  42:5  error  'timeout' is defined but never used  no-unused-vars

src/lib/state.ts
  17:3  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

2 problems (2 errors, 0 warnings)
```

For validation scripts that should fix what they can, add `--fix` before the other flags: `eslint . --fix --quiet --no-color --no-warn-ignored`.

## TypeScript compiler

```bash
tsc --noEmit --pretty false
```

| Flag | What it does |
|---|---|
| `--noEmit` | Type-check only, don't emit JavaScript. |
| `--pretty false` | One line per error, machine-readable, without source snippets, underlines, or color. |

Default `--pretty` mode produces 6-8 lines per error — a source snippet, a squiggly underline, related type information, and a summary. `--pretty false` compresses that into one line carrying everything the agent needs: file, location, error code, message. For 20 errors that is ~20 lines instead of ~140, a 7x reduction.

Pretty mode:

```
src/lib/prompt.ts:42:5 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.

42     processTimeout("300");
                      ~~~~~

  src/lib/types.ts:15:3
    15   timeout: number;
         ~~~~~~~
    The expected type comes from property 'timeout' which is declared here on type 'Config'
```

`--pretty false`:

```
src/lib/prompt.ts(42,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

The snippet and underline are redundant — the agent can open the file if it needs more context.

## Vitest

Control Vitest from `vitest.config.ts` rather than CLI flags: several key noise-reduction settings (bail, console suppression, stack-trace filtering, diff truncation) are config-only.

```typescript
// vitest.config.ts
const isAI =
  process.env.AI_OUTPUT === "1" || process.env.CLAUDECODE === "1";
const isCI = process.env.CI === "true";

function getReporters(): string[] {
  if (isCI) return ["dot", "github-actions"];
  if (isAI) return ["dot"];
  return ["default"];
}

export default defineConfig({
  test: {
    reporters: getReporters(),

    ...(isAI && {
      // Stop after 3 failures — cascading errors waste tokens
      bail: 3,

      // Suppress console.log output from test code
      onConsoleLog() {
        return false;
      },

      // Filter node_modules frames from stack traces
      onStackTrace(_error, { file }) {
        if (file.includes("node_modules")) return false;
      },

      // Truncate large diffs that would blow up context
      diff: {
        truncateThreshold: 2000,
        truncateAnnotation: "... diff truncated",
        expand: false,
      },
    }),
  },
});
```

| Setting | Purpose |
|---|---|
| `reporters: ["dot"]` | One character per test. Full failure details preserved. |
| `bail: 3` | Stop after 3 failures, so one root cause doesn't burn context on symptoms. |
| `onConsoleLog() { return false; }` | Suppress `console.log` from test code — usually debug noise for an agent. |
| `onStackTrace` filter | Remove `node_modules` frames; the agent only needs application locations. |
| `diff.truncateThreshold: 2000` | Truncate snapshot/object diffs past 2000 characters. |
| `diff.expand: false` | Show collapsed diffs (changed lines with context) rather than whole objects. |

**Why the `dot` reporter:** it prints one character per test (`.` pass, `x` fail) and shows full details only on failure. A 200-test passing suite becomes a single line of dots — roughly a 96% reduction versus the default reporter — while assertion message, expected/received values, and file location still print in full on failure.

Default reporter (200 tests, 1 failure):

```
 ✓ src/lib/config.test.ts (3 tests) 12ms
 ✓ src/lib/state.test.ts (5 tests) 24ms
 ... (47 more passing file lines)
 ✗ src/lib/prompt.test.ts (2 tests | 1 failed) 18ms
   ✗ should timeout after configured duration
     → expected 'running' to be 'timed_out'

 Test Files  1 failed | 49 passed (50)
 Tests  1 failed | 199 passed (200)
```

Dot reporter, same suite:

```
.....................................x.......
 FAIL  src/lib/prompt.test.ts > should timeout after configured duration
AssertionError: expected 'running' to be 'timed_out'
 - Expected: "timed_out"
 + Received: "running"

 Test Files  1 failed | 49 passed (50)
 Tests  1 failed | 199 passed (200)
```

Add `--no-color` when invoking from scripts.

## Jest

Jest's `summary` reporter with `summaryThreshold: 0` is the closest equivalent to Vitest's `dot` reporter: it eliminates per-file PASS/FAIL lines while preserving full failure details.

```typescript
// jest.config.ts
const isAI =
  process.env.AI_OUTPUT === "1" || process.env.CLAUDECODE === "1";

export default {
  reporters: isAI
    ? [["summary", { summaryThreshold: 0 }]]
    : ["default"],
};
```

The default reporter prints a line for every test file — `PASS src/lib/config.test.ts` and 48 siblings. For a 50-file suite with one failure that is 49 useless lines. `summaryThreshold: 0` ensures failure details always print regardless of suite count; the default threshold is 20.

CLI flags for AI mode:

```bash
jest --silent --no-color --bail=3
```

| Flag | What it does |
|---|---|
| `--silent` | Suppress `console.log` from test code. |
| `--no-color` | Disable ANSI codes. |
| `--bail=3` | Stop after 3 failures. |

## Prettier

```bash
prettier --write . > /dev/null 2>&1
```

Prettier's value is the write, not the file list. Discard the output.

## The `:ai` script convention

Keep human-facing scripts as they are and add explicit `:ai` variants. Agents and CI invoke the `:ai` names; humans keep readable output by default.

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

`&&` chaining in `check:ai` short-circuits on the first failure, so the agent sees one problem at a time rather than three tools' worth of output.

## Pre-commit hooks

The same detection pattern works in hooks (e.g. under Husky). Prefer the explicit `AI_OUTPUT=1` switch and accept `CLAUDECODE=1` as a convenience:

```bash
#!/bin/sh
set -e

# Format and stage
npx prettier --write . > /dev/null 2>&1
git add -u

# Lint — AI mode suppresses warnings and colors
if [ "${AI_OUTPUT:-0}" = "1" ] || [ "${CLAUDECODE:-0}" = "1" ]; then
  npx eslint . --fix --quiet --no-color --no-warn-ignored
else
  npx eslint . --fix
fi
git add -u

# Type check — AI mode uses one-line-per-error format
if [ "${AI_OUTPUT:-0}" = "1" ] || [ "${CLAUDECODE:-0}" = "1" ]; then
  tsc --noEmit --pretty false
else
  tsc --noEmit --pretty
fi

# Tests — reporter switching handled in the test-runner config
npx vitest run
```

## Deliberate exception: captured validation scripts

A pre-merge or CI validation script whose combined stdout/stderr is captured and surfaced to a human for post-hoc debugging may intentionally keep **human-readable** output — no `--quiet`, no `--pretty false`:

```bash
#!/usr/bin/env bash
set -euo pipefail

npx prettier --write .
npx eslint . --fix
npx tsc --noEmit --pretty
npx vitest run
```

The AI-optimal flags are for output an agent consumes **in real time** — pre-commit hooks and agent-invoked commands. When the audience for a captured log is a person debugging a failed merge, readability wins. Decide per consumer, not per tool.

## Quick reference

| Tool | Human command | AI command | Key difference |
|---|---|---|---|
| ESLint | `eslint .` | `eslint . --quiet --no-color --no-warn-ignored` | Errors only, no colors |
| TypeScript | `tsc --noEmit --pretty` | `tsc --noEmit --pretty false` | One line per error, no source snippets |
| Vitest | `vitest run` (default reporter) | `vitest run --no-color` (dot reporter via config) | 1 char per test, full failure detail |
| Jest | `jest` (default reporter) | `jest --silent --no-color --bail=3` (summary reporter via config) | No per-file PASS lines |
| Prettier | `prettier --write .` | `prettier --write . > /dev/null 2>&1` | Suppress file list |

## Anti-patterns

- **Truncating failures instead of successes.** Cutting error output to "save tokens" removes the only lines that matter. Cut the passing lines.
- **JSON formatters "because machines read them."** Structural keys cost 3-5x the tokens of a tabular format an LLM already parses correctly.
- **No bail limit.** One broken import producing 200 downstream failures fills the whole context with symptoms.
- **Coupling low-noise mode to one vendor's variable.** A config that only checks `CLAUDECODE` gives full-noise output to every other agent, CI runner, and operator. Own an `AI_OUTPUT` switch and map vendor signals onto it.
- **Only a quiet mode.** Deleting the human-readable scripts makes local debugging worse. Keep both; add `:ai` variants.
- **Assuming CLI flags suffice for test runners.** Bail, console suppression, stack-trace filtering, and diff truncation are config-only in Vitest; a `--reporter=dot` flag alone leaves most of the noise in place.

## Related skills

- `cli-tools-for-agents` — design a project CLI as the agent tool surface: exit codes, file payloads, jobs, doctor
- `logging-for-agent-debugging` — structured logs agents can debug from: stable event names, trace context, bounded analysis
