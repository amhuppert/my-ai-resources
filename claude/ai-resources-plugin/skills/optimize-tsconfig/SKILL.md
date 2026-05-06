---
name: optimize-tsconfig
description: Optimize tsconfig.json for build speed, watch mode, and tsc memory. Use for slow tsc, too many file watchers, or TypeScript performance audits.
argument-hint: "[path/to/tsconfig.json]"
allowed-tools: Read, Edit, Write, Bash(tsc:*), Bash(npx tsc:*), Glob, Grep, AskUserQuestion
disable-model-invocation: true
---

# TypeScript Configuration Performance Optimizer

Audit and optimize TypeScript configuration for faster builds, reduced memory usage, and fewer file watchers. Produces targeted, project-specific recommendations — not a generic checklist.

<target>
$ARGUMENTS
</target>

## Step 1: Discover TypeScript Configs

If no path was provided, find all tsconfig files in the project using the Glob tool with pattern `**/tsconfig*.json`.

Read each tsconfig, including any extended configs (follow `extends` chains to understand the full effective configuration). Note which settings are inherited vs. overridden.

## Step 2: Gather Diagnostics

Run `tsc --extendedDiagnostics` for each tsconfig to establish a baseline:

```bash
npx tsc -p path/to/tsconfig.json --extendedDiagnostics --noEmit
```

Record key metrics: Files checked, total time, memory used, program size. These are the numbers to improve.

If the concern is watch mode specifically, check the current `watchOptions` (or lack thereof) and ask the user to provide a file watcher count if available (e.g., from `lsof`, `/proc/PID/fdinfo`, or a tool like `watchman`).

## Step 3: Analyze and Recommend

Consult `references/tsconfig-performance.md` for the full catalog of optimization settings, tradeoffs, and impact rankings.

Evaluate each potential optimization against the project's current config. Categorize recommendations into tiers:

### Tier 1: No-Tradeoff Wins
Settings that improve performance with zero functional impact. Apply these unconditionally:

- **`watchOptions.excludeDirectories`** — Exclude `**/node_modules` and build output dirs from watch. Typical reduction: 90%+ of file watchers eliminated.
- **`watchOptions.watchFile: "useFsEvents"`** — Use OS-native file events instead of polling.
- **`skipLibCheck: true`** — Skip type-checking `.d.ts` files. Almost always safe.
- **`incremental: true`** — Cache compiler state for faster rebuilds. Add `tsBuildInfoFile` pointing to build output dir.

### Tier 2: Low-Risk, High-Impact
Settings with minor tradeoffs that are appropriate for most projects:

- **`isolatedModules: true`** — Enables fast transpilers (SWC, esbuild). May require removing const enums or namespace merging patterns.
- **`exclude` patterns** — Ensure test files, build output, and hidden directories are excluded from the main program. Consider a separate `tsconfig.test.json` for test files.
- **`watchOptions.fallbackPolling: "dynamicPriorityPolling"`** — Best fallback when FS events are unavailable.

### Tier 3: Situational
Settings that require deliberate tradeoff decisions — present these with clear context:

- **`types` array** — Restricting auto-included `@types` reduces program size but requires manual maintenance when adding dependencies. Recommend only when there's clear evidence of unnecessary types being pulled in.
- **`isolatedDeclarations`** (TS 5.5+) — Enables parallel `.d.ts` generation but requires explicit annotations on all exports.
- **`noCheck`** (TS 5.6+) — Skips type checking for emit-only builds. Only for split build pipelines.
- **Project references** — For monorepos with 5+ packages, splitting into composite projects reduces per-project work. Significant setup effort.
- **Editor memory flags** (`disableReferencedProjectLoad`, etc.) — Only for large monorepos where VS Code runs out of memory.

### What NOT to Recommend

- Disabling `strict` mode for performance — the impact is negligible and the safety loss is real.
- Removing useful `@types` packages unless they are clearly irrelevant to the project.
- Overly aggressive `exclude` patterns that might break type resolution.

## Step 4: Apply Changes

Present the tiered recommendations to the user. For Tier 1, suggest applying immediately. For Tier 2-3, explain the tradeoff and ask for confirmation.

When applying changes:
1. Edit each tsconfig to add the recommended settings
2. Run `tsc --noEmit` to verify the project still compiles cleanly
3. If watch mode was the concern, note that the user will need to restart `tsc --watch` to pick up the new `watchOptions`

## Step 5: Verify Improvement

Re-run `tsc --extendedDiagnostics` and compare against the Step 2 baseline. Report the before/after metrics.

If watch mode was the concern and the user can measure watcher counts, compare those as well.

## Additional Resources

### Reference Files

- **`references/tsconfig-performance.md`** — Complete catalog of performance-related tsconfig settings with explanations, tradeoffs, impact rankings, diagnostic commands, and code patterns that affect compiler performance
