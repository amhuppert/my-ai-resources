---
name: optimize-tsconfig
description: "Audit and optimize tsconfig.json for faster TypeScript builds, lower tsc memory, and fewer file watchers."
argument-hint: "[path/to/tsconfig.json]"
allowed-tools: Read, Edit, Write, Bash(tsc:*), Bash(npx tsc:*), Glob, Grep, AskUserQuestion
disable-model-invocation: true
---

# Optimize `tsconfig.json`

Audit TypeScript configuration for faster type checking, lower memory usage, and fewer watch-mode file watchers. Produce project-specific recommendations backed by measured diagnostics rather than a generic checklist.

## 1. Inspect configs and capture baseline

If the user named a config path, inspect it; otherwise find `**/tsconfig*.json` across the project. Follow every `extends` chain so you evaluate the effective configuration and know what is inherited vs. overridden.

Run a baseline check for each target config:

```bash
npx tsc -p path/to/tsconfig.json --extendedDiagnostics --noEmit
```

Record files checked, total time, memory used, and program size. If watch mode is the complaint, inspect `watchOptions` and ask the user for a live watcher count (from `lsof`, `/proc/PID/fdinfo`, or Watchman) only if they have it handy.

## 2. Evaluate against tiered recommendations

Read [`references/tsconfig-performance.md`](references/tsconfig-performance.md) for the exact option syntax, tradeoffs, diagnostic commands, and TypeScript code patterns affecting compile speed.

Group only the settings that apply to this project into three tiers:

- **Tier 1 (zero functional tradeoff):** `watchOptions.excludeDirectories`, `watchOptions.watchFile: "useFsEvents"`, `skipLibCheck: true`, `incremental: true` (with `tsBuildInfoFile` in the build output dir).
- **Tier 2 (low-risk, minor tradeoffs):** `isolatedModules: true`, tighter `exclude` patterns (including `node_modules` explicitly whenever `exclude` is set; separate `tsconfig.test.json` if tests inflate the main program), `watchOptions.fallbackPolling: "dynamicPriorityPolling"`.
- **Tier 3 (situational tradeoffs):** explicit `types` array (only when unused `@types/*` packages demonstrably bloat the program), `isolatedDeclarations` (TS 5.5+), `noCheck` (TS 5.6+, split pipelines only), composite project references (monorepos with 5+ packages), editor-only tsserver memory flags.

Do not recommend disabling `strict` mode, dropping `@types` packages the project actually uses, or broad `exclude` globs that break type resolution.

## 3. Apply changes (when requested) and verify

- If the user asked for an **audit**, present the baseline metrics and tiered recommendations without editing files.
- If the user asked to **optimize/apply**: apply Tier 1 changes directly, and explain tradeoffs and confirm before applying Tier 2 or Tier 3 settings.

After editing:

1. Run `npx tsc -p <path> --extendedDiagnostics --noEmit` to confirm a clean compile and capture after-metrics.
2. Report before vs. after metrics (files, time, memory, and watcher counts if measured).
3. If `watchOptions` changed, remind the user to restart `tsc --watch` for the new settings to take effect.

Done when every target tsconfig's effective config was inspected, baseline diagnostics were measured, recommendations match the actual config (no inapplicable options), and any applied edits pass `tsc --noEmit` with before/after numbers reported.
