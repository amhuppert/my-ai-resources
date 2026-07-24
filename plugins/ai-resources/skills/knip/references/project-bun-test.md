# Bun: Test Runner and `bun build --compile`

Load this when the project uses Bun's built-in test runner (`bun test ...` in package.json scripts) or compiles to a standalone executable via `bun build --compile`. Knip's Bun plugin is narrow — it does much less than you'd expect — so several common Bun patterns need explicit configuration.

## Plugin auto-detection

Knip's Bun plugin auto-enables when **`bun test`** appears in any `package.json` script. It does NOT auto-enable just because the lockfile is `bun.lock` / `bun.lockb`.

When enabled, it adds:
- `bunfig.toml` as a config file.
- Test entries from the `bun test` invocations (see below).
- The `--preload` argument from `bun test` invocations as a deferred entry.

That's the entire surface. The plugin does **not** handle:
- `bun run X` script chains.
- `bun build X` or `bun build --compile X` — compile targets are not auto-detected.
- The `bin` field. (That's actually handled by knip's core npm/package.json processing, not the Bun plugin — so `bin` entries are still resolved automatically; just not via the Bun plugin.)

## Auto-detected test globs

The Bun plugin parses arguments of each `bun test ...` script and produces entry patterns from them. Without explicit args, the plugin uses Bun's standard test discovery globs:

```
**/*.{test,spec}.{js,jsx,ts,tsx}
**/*_{test,spec}.{js,jsx,ts,tsx}
```

These cover files like:
- `foo.test.ts`, `foo.spec.tsx`
- `foo_test.ts`, `foo_spec.js`
- `__tests__/foo.test.ts` (matches via `**/`)
- `tests/integration/foo.test.ts` (matches via `**/`)

They do **not** cover:
- Files named without the `.test`/`.spec`/`_test`/`_spec` suffix (e.g., a manual `tests/run-everything.ts`).
- Helper files in test directories that aren't themselves tests (e.g., `__tests__/setup.ts`).

## When you need to add explicit test entries

### `bun test <dir>` style scripts

If `package.json` has a script like `"test:integration": "bun test tests/"`, the plugin may not fully resolve the directory argument into a glob — in practice integration tests at unusual paths show up as "unused files."

Fix in `knip.json`:

```jsonc
{
  "entry": [
    "tests/**/*.test.ts",
    "tests/**/*.spec.ts"
  ]
}
```

### Test setup / helper files

Helper files imported by `bun test`'s `--preload` are auto-traced. Helpers imported by individual tests are also fine. But helper files that bun test discovers by **convention** rather than explicit import (rare for `bun test`, but possible if you use `bun:test`'s `beforeAll` hooks defined in side-effect modules) need to be added as entries.

### Non-standard test file names

If the project uses `*.tests.ts` (note the plural), or `assertions/*.ts`, or any other convention that doesn't match Bun's default globs, add the glob to `entry`.

## `bun build --compile` — the big gotcha

The `bun build --compile <entry> --outfile <out>` command produces a standalone binary from a single TypeScript entry. Knip's Bun plugin does **not** parse these scripts.

If your `package.json` has:

```json
"scripts": {
  "build": "bun build src/main.ts --compile --outfile dist/my-cli"
}
```

then `src/main.ts` will be reported as unused (and everything reachable only from it will cascade) unless one of the following is true:
- The same file is also resolvable via the `bin` field (which knip's core does pick up).
- You explicitly add it to `entry` in `knip.json`.

Recommended config when `bin` does NOT point at the compile-target source:

```jsonc
{
  "entry": [
    "src/main.ts!"      // ! marks it as a production entry
  ]
}
```

The `!` suffix is important if you also intend to run `knip --production` — it tells knip this entry ships. See SKILL.md "Production Mode" for the full setup.

### Multi-binary projects

If a project compiles several binaries:

```json
"scripts": {
  "build": "bun build src/cli-a.ts --compile --outfile bin/cli-a && bun build src/cli-b.ts --compile --outfile bin/cli-b"
}
```

list each compile-target source:

```jsonc
{
  "entry": [
    "src/cli-a.ts!",
    "src/cli-b.ts!"
  ]
}
```

### Sub-built files via `Bun.build({entrypoints:[…]})`

If a script invokes `Bun.build` programmatically (e.g., a build helper that bundles a UI subcommand), knip cannot follow the string entrypoint:

```ts
// scripts/build-subcommand.ts
await Bun.build({ entrypoints: [join(here, "render-tui.tsx")] });
```

`render-tui.tsx` will be reported unused. Add it explicitly:

```jsonc
{
  "entry": [
    "scripts/render-tui.tsx"   // referenced via Bun.build({entrypoints:[…]})
  ]
}
```

## Scripts invoked from outside the package

Projects that ship a CLI via a slash command, hook, or shell wrapper sometimes invoke a TS file directly:

```bash
bun run /path/to/scripts/tool.ts "$ARGUMENTS"
```

If `tool.ts` isn't referenced from any other TypeScript file or `bin` entry, knip reports it unused. Add it to `entry`. Mark it `!` only if it's part of the shipping surface; usually these are dev/maintenance scripts that are NOT shipping entries.

## Type packages: `bun-types` vs `@types/bun`

`bun-types` is the legacy types package; `@types/bun` is the modern one (with `bun-types` as a transitive dep). If `tsconfig.json` has:

```json
"types": ["bun-types"]
```

and your direct devDependency is `@types/bun`, knip reports `bun-types` as an unresolved import. Fix the tsconfig:

```json
"types": ["bun"]
```

or remove the `types` array entirely (the ambient types kick in via `@types/bun`'s `typesVersions` field).

## Multi-package Bun repo without a workspaces declaration

Bun projects sometimes don't declare workspaces (no `workspaces` array, no `pnpm-workspace.yaml`), even though several packages share a repo. Knip's workspace machinery wants a real workspace declaration. In that shape, the simplest setup is **per-package**: install knip as a devDep in each package, drop a `knip.json` next to each `package.json`, and run `knip` from each package's directory.

If you want a single root command instead, you'd need a root `package.json` whose only purpose is hosting knip + a `workspaces` field that points at each sub-package. That works, but it adds a layer of tooling for thin payoff if the sub-packages don't share dependencies. Default to per-package.

## Quick Bun checklist

When configuring knip in a Bun project:

1. Confirm the Bun plugin enabled itself (look for it in `--debug` output). It only does so if `bun test` is in scripts.
2. Add explicit `entry` globs for any test directories that `bun test <dir>` doesn't fully resolve.
3. Add explicit `entry` files for every `bun build --compile` target.
4. Add explicit `entry` files for any `Bun.build({entrypoints:[…]})` strings.
5. Add explicit `entry` files for any TS files invoked by name from outside the package (slash commands, hooks, shell wrappers).
6. If `tsconfig.json` uses `"types": ["bun-types"]` but you've installed `@types/bun`, switch to `"types": ["bun"]` or remove the array.
