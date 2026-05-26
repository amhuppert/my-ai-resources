---
name: knip
description: Detect and remove dead code with knip. Use when the user asks to "run knip", "find unused files", "find unused exports", "find unused dependencies", "clean up dead code", "remove dead code", "set up knip", "configure knip", "knip.json", "knip false positive", "knip CI", or mentions a `knip` config, dependency bloat, bundle bloat from unused imports, or tree-shaking unused exports. Covers the configuration-first workflow, confidence-gated deletion, framework-specific gotchas (Next.js 15+, Tailwind, Storybook, Jest, Bun's test runner and `bun build --compile`), monorepos, CI integration, and performance tuning.
---

# Knip: Find and Remove Dead Code

Knip finds unused **files, exports, and dependencies** across a JavaScript/TypeScript project. It does *not* find unused imports or local variables inside a file — that is a linter's job (ESLint, Biome). Use knip for project-level dead code; use a linter for file-level dead code.

This file is the spine. Detailed configuration, framework-specific gotchas, monorepo guidance, CI integration, and performance tuning live in `references/` and load only when needed.

## When to Use This Skill

- The user asks to clean up dead code, find unused dependencies, or shrink bundle size from unused exports.
- The user is configuring knip for the first time in a project.
- A `knip.json` / `knip.config.ts` exists and is producing false positives.
- Setting up CI to catch dead-code regressions.

Do **not** use this skill for unused imports/variables inside a file — recommend ESLint's `no-unused-vars` or Biome instead.

## Setup

1. Check availability: `npx knip --version`.
2. If knip is not installed, check the package manager from the lockfile (`package-lock.json` → npm, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, `bun.lock` / `bun.lockb` → bun) and install with the matching command, e.g. `npm install -D knip`.
3. Check if a knip config exists: `knip.json`, `knip.jsonc`, `knip.config.{ts,js}`, or a `knip` key in `package.json`. If one exists, review it against [`references/config-patterns.md`](references/config-patterns.md) before running.

## The Configuration-First Workflow

**Even when the user says "just run knip" or "clean up the codebase", configure knip properly before acting on reported issues.** Ignoring configuration hints leads to acting on false positives, which deletes code that is actually used.

### Step 1 — Understand the project

Read `package.json` to identify:
- Frameworks (Next.js, Remix, Vite, Astro, etc.) — knip auto-enables [plugins](https://knip.dev/reference/plugins) for these.
- Test runner (Jest, Vitest, Playwright).
- Tooling that needs explicit config (Storybook, Tailwind, etc.).
- Monorepo signal: `workspaces` field, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`.

If the project is a monorepo, load [`references/monorepo.md`](references/monorepo.md) **before** running knip — monorepo misconfiguration cascades into hundreds of false positives.

### Step 2 — Run knip and read configuration hints FIRST

```bash
npx knip
```

The output is ordered: **configuration hints, then issues**. Address hints *before* issues. A hint typically means knip cannot resolve a plugin, entry, or dependency — fixing it eliminates whole categories of false positives at once.

For unfamiliar layouts (non-standard test dirs, custom build pipelines, no formal monorepo), run `npx knip --debug` instead — it lists every enabled plugin, its detected entries, and resolved workspace config, so you can confirm knip sees what you expect before deciding what to configure.

### Step 3 — Adjust the config based on hints

Common adjustments (see [`references/config-patterns.md`](references/config-patterns.md) for the full set):
- Enable or disable a framework plugin explicitly.
- Add `paths` (tsconfig-style) for path aliases that knip can't resolve.
- For the specific frameworks below, jump to:
  - Next.js 15+ → [`references/project-nextjs.md`](references/project-nextjs.md)
  - Tailwind → [`references/project-tailwind.md`](references/project-tailwind.md)
  - Storybook → [`references/project-storybook.md`](references/project-storybook.md)
  - Jest → [`references/project-jest.md`](references/project-jest.md)

### Step 4 — Repeat steps 2-3 until hints are gone

Re-run knip after each config change. Stop iterating only when the hint section is empty.

### Step 5 — Address issues in priority order

1. **Unused files** — handle first. Removing files often cascades into newly-unused exports and dependencies, so this is the "inbox zero" move.
2. **Unused dependencies** — remove from `package.json` (`dependencies`).
3. **Unused devDependencies** — remove from `package.json` (`devDependencies`).
4. **Unused exports** — remove the export, or downgrade to an internal (non-exported) declaration. Before finalizing, grep the export's name across docstrings — paired helpers ("call X before Y") and "Export functions for programmatic use" sections often reference deleted/downgraded names and will be misleading if left dangling.
5. **Unused exported types** — remove, or if the pattern is "type used only in the file that exports it", configure `ignoreExportsUsedInFile` instead (see [`references/exports-advanced.md`](references/exports-advanced.md)).

### Step 6 — Re-run after each batch

Removing unused files frequently exposes newly-unused exports and dependencies. Keep iterating until the report is clean (or only contains known, justified false positives).

## Confidence-Gated Deletion

**First — establish whether the package is published or private**, because the "public API" heuristics below only apply to published packages:

- **Published package** (no `"private": true` in package.json, OR has a real `version` published on npm): `lib/`, `src/index.*`, `exports`/`main` targets are *real* external API. Treat them as load-bearing — get user confirmation before deleting.
- **Private package** (`"private": true`, no npm publishing): "exports" are just module-graph wiring within the repo. If knip + grep agree nothing imports them, they're internal dead code — verify with grep, then act. The `lib/` directory has no external consumers in this case.

**Do not auto-delete anything in these categories. Use AskUserQuestion to confirm first:**

- **(Published packages only)** Files in `src/index.{ts,tsx,js}`, `lib/`, or paths containing `public`, `api`, or matching the `exports`/`main` field of `package.json` — these are likely public API surface.
- Files that could be **dynamically imported** (`await import(...)`), referenced by runtime mechanisms (Next.js routing, Storybook story discovery), or named to suggest plugin-style loading (`plugins/*.ts`, `routes/*.ts`).
- Dependencies that may be used via **CLI** (e.g., `prettier`, `eslint`, `husky`) or as **peer dependencies** of another package.
- Files that match a glob in a config file's "entries", "plugins", or "addons" array.

**You may auto-delete (without asking) only when ALL of the following are true:**
- The package is private, OR the file/export is clearly internal to a published package (not in the public API paths above).
- It is not referenced by string in any config file.
- It is not a known dynamic-import target.
- The user has explicitly authorized auto-deletion for this session, or you are running under `--fix` with the user's prior approval.

## Auto-Fix

Use `--fix` only AFTER the configuration-first workflow is complete and the hint section is empty.

```bash
npx knip --fix                        # remove unused exports + unused deps from package.json
npx knip --fix --allow-remove-files   # also delete unused files
```

Always run the project's formatter after `--fix` (see [`references/ci-integration.md`](references/ci-integration.md) on formatting after fix). Review the diff before committing.

## Production Mode

For projects that ship code to users, configure a separate **production-mode** check and add a `"knip:production": "knip --production"` script alongside the default `"knip"` script.

```bash
npx knip --production
```

Production mode strictly analyzes only code that reaches users — tests, stories, dev tooling, and `devDependencies` are excluded. Use this in addition to the default check, not instead of it. See [`references/ci-integration.md`](references/ci-integration.md) for the canonical "two checks in CI" pattern.

**Important:** use `--production` to exclude tests/stories from "shipping code" analysis. Do **not** use `ignore` patterns to exclude tests — that hides real issues.

### How production mode decides what to analyze

Production mode includes:
- Entry and project patterns suffixed with `!` (e.g., `"src/index.ts!"`, `"src/**/*.ts!"`).
- Production entry patterns auto-detected by enabled plugins (Next.js routes/middleware, Remix routes, etc.).
- The `start` script from `package.json`.
- Exports **not** tagged `@internal`.

Production mode excludes:
- Test files, Storybook stories, config files.
- `devDependencies` (only `dependencies` are checked).
- Exports tagged `@internal`.

### Production mode pitfalls and how to handle them

1. **No `!` markers anywhere → almost everything is reported "unused."** This is the #1 production-mode trap. If a plugin doesn't designate production entries for your project (e.g., custom CLI/server builds, Bun's `bun build --compile`), nothing is in scope until you mark entries with `!`. Add the script and config together — do not commit a `knip:production` script with zero `!` markers.

2. **Plugins don't always know your production entries.** Knip's Bun plugin parses `bun test` for test entries but does **not** auto-detect entries from `bun build --compile`, `bun run X` script chains, or compile-target CLI binaries. The same is true for any custom build script. Add the real shipping entries to `entry` with `!`. Example:

   ```jsonc
   {
     "entry": [
       "src/main.ts!",      // bun build --compile target
       "src/cli.ts!"        // another binary's entrypoint
     ]
   }
   ```

3. **String-referenced entries (`Bun.build({entrypoints:[…]})`, dynamic `import(`./${x}`)`).** Knip can't trace strings to files. Add such files explicitly to `entry`, then add `!` if they ship.

4. **Type-only exports flagged unused.** If types live in dedicated files that are only `import type`-ed, they may appear unused in production mode. Filter the report with `--exclude types`, or move types next to the value they describe.

5. **Test helpers / mocks living inside `src/`.** Negate them in the production project pattern: `["src/**/*.ts!", "!src/test-helpers/**!"]`.

6. **Exports intended as public API but currently unused.** Tag with `/** @public */` so knip doesn't flag them in default mode. Tag internal-only helpers with `/** @internal */` so they're excluded from production-mode reports.

7. **`--strict` implies `--production`** — and also checks workspace isolation and `peerDependencies`. Don't pass both flags; pick the strictest one you need.

### Recommended setup order

Don't add the `knip:production` script bare. The right order:

1. Get the default `npx knip` run clean (configuration-first workflow, hint section empty).
2. Identify what actually ships: built binaries' source entries, library `exports` targets, server entrypoints. Build scripts, test scripts, install scripts, and dev tooling are NOT production.
3. Add `!` to those entries in `knip.json`.
4. Add `@internal` JSDoc tags to exports that are intentionally not part of the shipping surface (test utilities exported for tests, debug helpers).
5. Run `npx knip --production --debug` and verify the file list under "Production entries" matches your shipping surface.
6. Only then add the `knip:production` script.

## When to Load Each Reference

| Load this | When |
|---|---|
| [`references/config-patterns.md`](references/config-patterns.md) | Reviewing or authoring a knip config — broad-ignore avoidance, paths, schema, run-without-config, project/entry separation, negation patterns |
| [`references/monorepo.md`](references/monorepo.md) | The project has workspaces (`workspaces`, `pnpm-workspace.yaml`, Nx, Turborepo) — load BEFORE running knip |
| [`references/ci-integration.md`](references/ci-integration.md) | Adding knip to CI — cache, max-issues, separate production check, reporters, watch mode |
| [`references/performance.md`](references/performance.md) | Knip is slow (large codebase or monorepo) — `--cache`, Bun runtime, workspace filters, issue-type filtering |
| [`references/exports-advanced.md`](references/exports-advanced.md) | Lots of export false positives — JSDoc `@public` tagging, re-exports/barrels, class members, `ignoreExportsUsedInFile`, `--include-entry-exports` |
| [`references/project-nextjs.md`](references/project-nextjs.md) | Project uses Next.js 15 or newer |
| [`references/project-tailwind.md`](references/project-tailwind.md) | Project uses Tailwind CSS (v3 or v4) |
| [`references/project-storybook.md`](references/project-storybook.md) | Project has a `.storybook/` directory or `@storybook/*` deps |
| [`references/project-jest.md`](references/project-jest.md) | Project uses Jest as its test runner |
| [`references/project-bun-test.md`](references/project-bun-test.md) | Project uses Bun's built-in test runner (`bun test`), `bun build --compile`, or has scripts like `bun test tests/` |

## Common Configuration Mistakes

These come up so often they're worth stating up front. Full details in [`references/config-patterns.md`](references/config-patterns.md).

- **Never use the broad `ignore` field.** It hides every issue type in those paths, including legitimate ones. Use targeted options instead (`ignoreFiles`, `ignoreDependencies`, `ignoreExportsUsedInFile`).
- **Don't re-ignore `.gitignore` paths.** Knip already respects `.gitignore` — listing `node_modules`, `dist`, `build`, `.git` is redundant.
- **Don't ignore config files** (e.g., `vite.config.ts`) when they're flagged unused. Enable or disable the relevant **plugin** instead.
- **Don't duplicate plugin defaults in `entry`.** Auto-detected plugins already add their standard entry points. Custom `entry` **overrides** defaults — it does not merge.
- **Don't use `ignore` to exclude tests/stories.** Use `--production` with `!`-suffixed entry markers.
- **Node.js builtin-name collisions** (e.g., a package named `buffer` or `process`): add to `ignoreDependencies`.

## Error Handling

| Symptom | Cause | Fix |
|---|---|---|
| Exit code 2 with "error loading file" | Knip can't parse a config or source file | Create or fix `knip.json` at the project root; check the file knip names in the error |
| "Unable to find a configuration file" | No knip config and project has unusual layout | Create a minimal `knip.json` with `{"$schema":"https://unpkg.com/knip@5/schema.json"}` and let plugins auto-configure |
| Hundreds of false positives in a monorepo | Workspaces not configured | Load [`references/monorepo.md`](references/monorepo.md) |
| `ts-jest` reported unused after renaming jest config to `.mjs` | Known knip issue with `.mjs` Jest configs | See [`references/project-jest.md`](references/project-jest.md) |
| `@storybook/builder-vite` reported unused | Known knip issue with `core.builder` reference | See [`references/project-storybook.md`](references/project-storybook.md) |

## Common Commands

```bash
npx knip                              # default run (all code, all deps, all entries)
npx knip --production                 # shipping code only (excludes tests, stories, dev tooling)
npx knip --fix                        # auto-remove unused exports and devDependencies
npx knip --fix --allow-remove-files   # also delete unused files
npx knip --reporter json              # JSON output for parsing/CI
npx knip --include files,dependencies # report only specific issue types
npx knip --cache                      # use cache for faster repeat runs
npx knip --debug                      # verbose output, useful for diagnosing missed entries
```
