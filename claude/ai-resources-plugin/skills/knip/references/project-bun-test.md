# Knip with Bun (`bun test` and `bun build --compile`)

Load when the project runs `bun test` in `package.json` scripts or compiles binaries with `bun build --compile`. Knip's Bun plugin has a small scope, so several Bun idioms require explicit entries.

## What the Bun plugin does and does not detect

The Bun plugin enables **only** when `bun test` appears in a `package.json` script (a `bun.lock` / `bun.lockb` lockfile alone does not activate it). Confirm activation in `npx knip --debug`.

When active, it adds `bunfig.toml`, `--preload` scripts passed to `bun test`, and Bun's default test globs:

```text
**/*.{test,spec}.{js,jsx,ts,tsx}
**/*_{test,spec}.{js,jsx,ts,tsx}
```

It does **not** trace `bun run X` script chains or `bun build` / `bun build --compile` targets. (`package.json#bin` works via knip's core npm handling, not the Bun plugin.)

## Patterns requiring explicit `entry` globs

1. **Directory arguments like `"test:integration": "bun test tests/"`:** knip may fail to expand directory args into globs. Add explicit globs (`"entry": ["tests/**/*.test.ts", "tests/**/*.spec.ts"]`) and any convention-loaded setup helpers or non-standard suffixes (`*.tests.ts`).
2. **`bun build --compile` targets:** unless the source file is also pointed to by `package.json#bin`, knip flags the compile target and everything reachable only from it. List every compiled binary entry with `!` so `--production` includes it:
   ```jsonc
   { "entry": ["src/cli-a.ts!", "src/cli-b.ts!"] }
   ```
3. **Programmatic `Bun.build({ entrypoints: [...] })`:** knip cannot trace string paths passed to `Bun.build`. Add each entrypoint file to `entry` (with `!` if it ships).
4. **Externally invoked scripts:** TS files executed directly from hooks, slash commands, or shell wrappers (`bun run scripts/tool.ts`) must be listed in `entry` (omit `!` if they are dev-only scripts).

## Type packages: `@types/bun` vs. `bun-types`

If `devDependencies` has `@types/bun` while `tsconfig.json` still lists `"types": ["bun-types"]`, knip reports `bun-types` as an unresolved dependency. Change `tsconfig.json` to `"types": ["bun"]` or remove the `types` array so `@types/bun`'s ambient types apply.

## Multi-package Bun repos without declared workspaces

If a Bun repo holds multiple packages without a root `workspaces` array, install knip per package with a local `knip.json` next to each `package.json` rather than inventing a synthetic root workspace solely for knip.
