# Tool-by-Tool Configuration for AI-Optimal Output

Detailed configuration guidance for each validation tool, including config file examples, output comparisons, and rationale.

## ESLint

### AI-Optimal Command

```bash
eslint . --quiet --no-color --no-warn-ignored
```

| Flag | Purpose |
|------|---------|
| `--quiet` | Report errors only, suppress warnings. In ESLint v9+, warning-level rules don't even execute, improving performance. |
| `--no-color` | Disable ANSI color codes. |
| `--no-warn-ignored` | Suppress "File ignored because of a matching ignore pattern" messages. |

### Why the Default `stylish` Formatter Is Fine

ESLint v9 ships with `stylish` as its built-in default. It groups errors by file — the path appears once as a header with errors listed underneath. This is more token-efficient than `compact` or `unix` formatters, which repeat the full file path on every line. The `json` formatter adds ~3-5x token overhead from structural keys (`"filePath"`, `"ruleId"`, `"severity"`, etc.) for minimal benefit.

Note: ESLint v9 removed `compact`, `unix`, `visualstudio`, `tap`, `junit`, and other formatters from core. They are available as standalone packages from `eslint-community/eslint-formatters`, but `stylish` is sufficient for AI consumption.

### Output Example (AI Mode)

```
src/lib/prompt.ts
  42:5  error  'timeout' is defined but never used  no-unused-vars

src/lib/state.ts
  17:3  error  Unexpected any. Specify a different type  @typescript-eslint/no-explicit-any

2 problems (2 errors, 0 warnings)
```

### With Auto-Fix (Validation Scripts)

Add `--fix` before other flags to auto-fix what ESLint can and report remaining errors:

```bash
eslint . --fix --quiet --no-color --no-warn-ignored
```

---

## TypeScript Compiler

### AI-Optimal Command

```bash
tsc --noEmit --pretty false
```

| Flag | Purpose |
|------|---------|
| `--noEmit` | Type-check only, don't emit JavaScript files. |
| `--pretty false` | One-line-per-error machine-readable format. No source snippets, underlines, or color codes. |

### Why `--pretty false`

The default `--pretty` mode produces 6-8 lines per error: a source snippet, a squiggly underline, related type information, and a summary. `--pretty false` compresses this to a single line containing file, location, error code, and message. For 20 errors, that's ~20 lines vs. ~140 lines — a 7x reduction.

The agent can read source files directly if it needs context. The source snippet and underline are redundant.

### Output Comparison

Pretty mode (default):
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

### Notes

- No JSON output mode exists for `tsc`. If structured JSON is needed, pipe `tsc --pretty false` through `tsc-output-parser`, but for AI consumption the one-line plain text format is already optimal.
- Avoid `--diagnostics` (adds compiler performance stats) and `--listFiles` (lists all files in compilation) — both are noise for an agent.

---

## Vitest

### AI-Optimal Configuration

Vitest output is best controlled through `vitest.config.ts` rather than CLI flags, because several key noise-reduction settings are only available as config options.

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

const isAI = process.env.CLAUDECODE === "1";
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

### Why the `dot` Reporter

Prints one character per test (`.` for pass, `x` for fail) and only shows full details on failure. A 200-test passing suite becomes a single line of dots — ~96% reduction in output volume. Failure details (assertion message, expected/received values, file location) are still printed in full.

### Setting Explanations

| Setting | Purpose |
|---------|---------|
| `reporters: ["dot"]` | One character per test. Full failure details preserved. |
| `bail: 3` | Stop after 3 failures. Prevents cascading errors from one root cause burning tokens. |
| `onConsoleLog() { return false; }` | Suppress `console.log` from test code. Tests often log debug info that is pure noise for an agent. |
| `onStackTrace` filter | Remove `node_modules` frames from stack traces. The agent only needs application code locations. |
| `diff.truncateThreshold: 2000` | Truncate snapshot/object diffs exceeding 2000 characters. |
| `diff.expand: false` | Show collapsed diffs (changed lines with context) rather than full objects. |

### CLI Flag

Add `--no-color` when running from scripts:

```bash
vitest run --no-color
```

Reporter switching is automatic via `CLAUDECODE=1` detection in the config.

### Output Comparison

Default reporter (200 tests, 1 failure):
```
 ✓ src/lib/config.test.ts (3 tests) 12ms
 ✓ src/lib/state.test.ts (5 tests) 24ms
 ✓ src/lib/sessions.test.ts (8 tests) 31ms
 ... (47 more passing file lines)
 ✗ src/lib/prompt.test.ts (2 tests | 1 failed) 18ms
   ✗ should timeout after configured duration
     → expected 'running' to be 'timed_out'

 Test Files  1 failed | 49 passed (50)
 Tests  1 failed | 199 passed (200)
```

Dot reporter (same suite):
```
.....................................x.......
 FAIL  src/lib/prompt.test.ts > should timeout after configured duration
AssertionError: expected 'running' to be 'timed_out'
 - Expected: "timed_out"
 + Received: "running"

 Test Files  1 failed | 49 passed (50)
 Tests  1 failed | 199 passed (200)
```

---

## Jest

### AI-Optimal Configuration

Jest's `summary` reporter with `summaryThreshold: 0` eliminates per-file PASS/FAIL lines while preserving full failure details.

```typescript
// jest.config.ts
const isAI = process.env.CLAUDECODE === "1";

export default {
  reporters: isAI
    ? [["summary", { summaryThreshold: 0 }]]
    : ["default"],
};
```

### Why `summary` with `summaryThreshold: 0`

The default reporter prints a line for every test file. For a 50-file suite with 1 failure, that's 49 useless PASS lines. The `summary` reporter skips all of that and only shows failure details plus the final count. `summaryThreshold: 0` ensures failure details are always printed regardless of how many test suites ran (the default threshold is 20).

### CLI Flags

```bash
jest --silent --no-color --bail=3
```

| Flag | Purpose |
|------|---------|
| `--silent` | Suppress `console.log` from test code. |
| `--no-color` | Disable ANSI codes. |
| `--bail=3` | Stop after 3 failures. |

### Output Comparison

Default reporter (50 files, 1 failure):
```
 PASS src/lib/config.test.ts
 PASS src/lib/state.test.ts
 PASS src/lib/sessions.test.ts
 ... (46 more PASS lines)
 FAIL src/lib/prompt.test.ts
  ● should timeout after configured duration
    expect(received).toBe(expected)
    Expected: "timed_out"
    Received: "running"
      at Object.<anonymous> (src/lib/prompt.test.ts:42:5)

Test Suites: 1 failed, 49 passed, 50 total
Tests:       1 failed, 199 passed, 200 total
```

Summary reporter:
```
  ● src/lib/prompt.test.ts > should timeout after configured duration
    expect(received).toBe(expected)
    Expected: "timed_out"
    Received: "running"
      at Object.<anonymous> (src/lib/prompt.test.ts:42:5)

Test Suites: 1 failed, 49 passed, 50 total
Tests:       1 failed, 199 passed, 200 total
```

---

## Combined Validation Script

Chain all tools for a single `check:ai` script:

```json
{
  "check:ai": "eslint . --quiet --no-color --no-warn-ignored && tsc --noEmit --pretty false && vitest run --no-color"
}
```

The `&&` chaining short-circuits on first failure, so the agent only sees errors from the first tool that fails — keeping output minimal.

For Jest projects, replace the vitest command:

```json
{
  "check:ai": "eslint . --quiet --no-color --no-warn-ignored && tsc --noEmit --pretty false && jest --silent --no-color --bail=3"
}
```
