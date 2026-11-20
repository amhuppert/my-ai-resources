---
name: knip
description: "Configure knip and remove unused files, exports, and dependencies safely across JS/TS projects and monorepos."
disable-model-invocation: true
---

# Knip: find and remove dead code

Knip detects project-level dead code: unused **files, exports, and dependencies** in JavaScript/TypeScript repositories. It does not check unused imports or local variables inside a file (use ESLint `no-unused-vars` or Biome for those). Run `npx knip --help` when you need full CLI flag details.

Load detailed guidance from `references/` only when the project or task calls for it.

## 1. Setup and project scan

1. Check `npx knip --version`. If missing, detect the package manager from the lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`/`bun.lockb`) and install `knip` as a devDependency.
2. Read `package.json` for frameworks, test runners, tooling (Storybook, Tailwind), and workspace signals (`workspaces`, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`).
3. If the project is a monorepo, read [`references/monorepo.md`](references/monorepo.md) **before** running knip; misconfigured workspaces produce hundreds of false positives.
4. If a knip config already exists (`knip.json`, `knip.jsonc`, `knip.config.{ts,js}`, or `package.json#knip`), review it against [`references/config-patterns.md`](references/config-patterns.md).

## 2. Configuration-first workflow

Even when the user says "just run knip" or "clean up dead code", resolve configuration hints before deleting anything. Acting on unconfigured output deletes live code.

1. Run `npx knip` (or `npx knip --debug` on unfamiliar layouts to verify enabled plugins, resolved workspaces, and detected entries).
2. Read the **configuration hints** section at the top of the output first. Fix every hint by adjusting `knip.json` (enable/disable plugins, add missing `paths`, or load the matching framework reference below).
3. Repeat until the hints section is empty.

Three configuration traps to avoid up front (full catalog in [`references/config-patterns.md`](references/config-patterns.md)):

- **Never use the bare `ignore` field:** it suppresses every issue type on matching paths. Use targeted fields (`ignoreFiles`, `ignoreDependencies`, `ignoreExportsUsedInFile`) or array negation (`!`).
- **Do not duplicate plugin defaults in `entry`:** plugin-level `entry`/`config` blocks replace defaults instead of merging. Add extra entries at top-level `entry` (or inside the workspace block in a monorepo).
- **Do not `ignore` tests or `.gitignore` paths:** knip already honors `.gitignore`, and `--production` excludes tests and stories cleanly.

## 3. Clean issues in cascade order

Work top-down and re-run `npx knip` after each batch, because deleting unused files exposes newly unused exports and dependencies:

1. **Unused files**
2. **Unused `dependencies`** in `package.json`
3. **Unused `devDependencies`** in `package.json`
4. **Unused exports:** remove or un-export. Before finishing, grep removed export names across docstrings and comments so paired references do not go stale.
5. **Unused exported types:** remove, or set `ignoreExportsUsedInFile: { interface: true, type: true }` when types are exported only for same-file clarity (see [`references/exports-advanced.md`](references/exports-advanced.md)).

## 4. Confidence-gated deletion

Check whether the package is **published** (no `"private": true`, or published to npm) or **private** (`"private": true`, no external consumers) before deleting:

- **Published packages:** treat `src/index.*`, `lib/`, `public`/`api` paths, and `package.json` `main`/`exports` targets as external API. Ask before deleting.
- **Private packages:** exports are internal module wiring. If knip and grep both confirm zero references, they are dead code.

Always ask the user before deleting any of these:

- Public API paths in a published package.
- Potential dynamic-import targets (`await import(...)`), runtime-discovered routes/stories, or plugin-style files (`plugins/*.ts`, `routes/*.ts`).
- Dependencies that may be invoked via CLI (`prettier`, `eslint`, `husky`) or required as peer dependencies.
- Files matching string entries in config files (`entries`, `plugins`, `addons`).

Auto-delete (or run `npx knip --fix` / `npx knip --fix --allow-remove-files`) only when the hints section is empty, the target is clearly internal and not string-referenced or dynamically imported, and the user has authorized deletion for the session. Always run the project's formatter (`--format` or the repo formatter) after `--fix`, then review the diff.

## 5. Production mode (`--production`)

For projects that ship code to users, pair the default `knip` script with `"knip:production": "knip --production"` (or `--strict` in monorepos, which implies `--production` plus workspace isolation; do not pass both). Production mode checks only shipping code (`!`-marked entries, auto-detected production entries, `start` script, non-`@internal` exports, and runtime `dependencies`).

Key pitfalls:

- **Zero `!` markers:** if no plugin auto-detects production entries (common for CLIs, custom servers, and `bun build --compile`), almost everything reports unused. Always configure `!` entries before adding the `knip:production` script:
  ```jsonc
  { "entry": ["src/main.ts!", "src/cli.ts!"] }
  ```
- **String-referenced entrypoints** (`Bun.build({ entrypoints: [...] })`, template-string dynamic imports) must be listed in `entry`, with `!` if they ship.
- **Test helpers inside `src/`:** negate them in the production project glob (`["src/**/*.ts!", "!src/test-helpers/**!"]`), and tag non-shipping exports with `/** @internal */` (or intentionally unused public API with `/** @public */` plus `"tags": ["-public"]`).
- **Setup order:** get default `npx knip` clean first -> add `!` to real shipping entries -> tag `@internal` helpers -> verify `npx knip --production --debug` lists the exact shipping surface -> then add the `knip:production` script.

## Load references by need

| Reference | When to load |
| --- | --- |
| [`references/config-patterns.md`](references/config-patterns.md) | Authoring or reviewing `knip.json` (`entry` vs. `project`, `$schema`, `ignore*`, `paths`, `ignoreExportsUsedInFile`) |
| [`references/monorepo.md`](references/monorepo.md) | Any repo with workspaces, Turborepo, or Nx (load **before** running knip) |
| [`references/ci-integration.md`](references/ci-integration.md) | Wiring knip into CI (two-check pattern, `--max-issues`, cache, reporters, watch mode) |
| [`references/performance.md`](references/performance.md) | Slow runs on large repos (`--cache`, Bun, workspace/issue filters, `--performance`) |
| [`references/exports-advanced.md`](references/exports-advanced.md) | Export false positives (`@public`/`@internal`, `includeEntryExports`, barrels, `--trace-*`, `--include-libs`) |
| [`references/project-nextjs.md`](references/project-nextjs.md) | Next.js 15+ projects |
| [`references/project-tailwind.md`](references/project-tailwind.md) | Tailwind CSS v3 or v4 projects |
| [`references/project-storybook.md`](references/project-storybook.md) | Storybook (`.storybook/` or `@storybook/*`) |
| [`references/project-jest.md`](references/project-jest.md) | Jest test runner |
| [`references/project-bun-test.md`](references/project-bun-test.md) | Bun test runner (`bun test`) or `bun build --compile` |

## Common errors

| Symptom | Cause and fix |
| --- | --- |
| Exit 2: "error loading file" | Unparseable config or source file; check the exact path knip reports |
| "Unable to find a configuration file" | Unusual layout; add `{"$schema":"https://unpkg.com/knip@5/schema.json"}` at root |
| Hundreds of false positives in a monorepo | Workspaces not configured; load [`references/monorepo.md`](references/monorepo.md) |
| `ts-jest` flagged with `.mjs` Jest config | Known knip `.mjs` quirk; see [`references/project-jest.md`](references/project-jest.md) |
| `@storybook/builder-vite` flagged unused | Known `core.builder` string-ref gap; see [`references/project-storybook.md`](references/project-storybook.md) |

## Completion criteria

Done when `npx knip` reports zero configuration hints, every deleted file/export/dependency was verified safe under the confidence rules (with user confirmation for public/dynamic/CLI items), the formatter and existing checks still pass after edits, and any remaining findings are documented as intentional exceptions or deferred items.
