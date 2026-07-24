# Advanced: Handling Export Issues

When the default knip run flags exports you believe are used, work through this reference. Most of these patterns address legitimate uses knip can't statically see.

## Tag intentionally public exports with `@public`

The cleanest way to say "this export looks unused but is intentionally part of the API": JSDoc `@public`.

```typescript
/**
 * Format a date for the public API.
 * @public
 */
export const formatDate = (d: Date) => d.toISOString();
```

```json
{ "tags": ["-public"] }
```

The `-` prefix tells knip to **exclude** anything tagged `@public` from unused-export reports.

You can also use the inverse pattern — only report exports tagged with `@internal` (i.e., enforce that everything else is public):

```json
{ "tags": ["+internal"] }
```

Use `@public` tagging for:
- Exports invoked by framework runtime (Next.js server actions, Remix loaders, route handlers).
- Functions that may be consumed externally but aren't yet (e.g., during phased rollouts).
- SDK / library public surface.

## `includeEntryExports` for private packages

By default, knip does **not** report unused exports from entry files — they may be consumed externally. This is the right default for published libraries.

For **private/internal packages** (everything in a monolith, every workspace in a private monorepo), turn it on:

```json
{ "includeEntryExports": true }
```

Per-workspace:

```json
{
  "workspaces": {
    "packages/internal-lib": { "includeEntryExports": true },
    "packages/public-sdk":   { "includeEntryExports": false }
  }
}
```

For monorepos with mixed public/private packages, set true at the root and false on the published ones.

## `ignoreExportsUsedInFile` — eliminate same-file noise

This is the single most useful escape hatch. It covers the very common pattern:

```typescript
// math.ts
export const add = (a: number, b: number) => a + b;
export const multiply = (a: number, b: number) => a * b;
// Only used in this file — but exported for testability
export const complexCalc = (x: number) => multiply(add(x, 1), 2);
```

Knip reports `add` and `multiply` as unused because no other file imports them.

Fix:

```json
{ "ignoreExportsUsedInFile": true }
```

Or, more conservative — only ignore type-level same-file usage:

```json
{ "ignoreExportsUsedInFile": { "interface": true, "type": true } }
```

The type-only variant is a safe default to ship in nearly every project.

## Barrel files and re-exports

Knip tracks re-exports through barrel files (`export * from './utils'`). Unused items in a re-export chain are reported.

If a barrel makes everything *look* used (because the barrel is itself an entry), turn on `includeEntryExports` (see above). If you want to find out **why** something is reported unused or used, trace it:

```bash
npx knip --trace-export formatDate
```

Output:

```
Tracing export: formatDate
  ← re-exported from src/helpers.ts
  ← re-exported from src/index.ts
  ← NOT imported elsewhere
```

Auto-fix safely removes unused items from re-export statements (`export { used, unused } from './x'` → `export { used } from './x'`):

```bash
npx knip --fix --fix-type exports
```

## Tracing before you delete

When knip reports an export as unused and your gut says it's used, trace before deleting.

```bash
npx knip --trace-export formatDate          # where, if anywhere, is formatDate consumed?
npx knip --trace-file src/utils/date.ts     # what imports this file?
npx knip --trace-dependency lodash          # where is lodash imported?
```

Tracing is the single most important verification step before deleting anything that touches:
- Files referenced by config (jest setup files, next.config plugin imports, etc.).
- Plugin-style code (loaded by name, dynamically imported, registered via config).
- Anything in an exports/main field of package.json.

## Class member detection

By default, unused class methods and properties are not reported (they often belong to interface implementations or framework lifecycle). Opt in when auditing classes:

```bash
npx knip --include classMembers
```

Or permanently:

```json
{ "rules": { "classMembers": "error" } }
```

If enum members are too noisy, exclude them:

```bash
npx knip --include classMembers --exclude enumMembers
```

## `--include-libs` for type-based consumption

When an exported type is consumed only through external library types (e.g., a plugin config interface used by a third-party plugin runtime), knip won't see the usage. Reveal it with:

```bash
npx knip --include-libs
```

This is **expensive** — knip walks type definitions from `node_modules`. Use it as a one-time investigation, not in the default run.

The typical pattern:

```bash
npx knip --trace-export PluginConfig      # quick first try
npx knip --include-libs --trace-export PluginConfig   # if still mysterious
```

## Decision tree: this export is reported unused, what now?

1. **Is it part of a public/library API?** → `@public` tag + `tags: ["-public"]`.
2. **Is it only used in its own file?** → `ignoreExportsUsedInFile` (type-only or full).
3. **Is the project private/monorepo-internal?** → `includeEntryExports: true` once across the board; the "unused entry export" reports are now reliable.
4. **Is it consumed via dynamic import, plugin loading, or config string?** → add the consumer file to `entry`, or accept the report and tag `@public`.
5. **Is it consumed by a third-party library type?** → trace with `--include-libs` to confirm, then tag `@public`.
6. **None of the above** → it's genuinely unused. Delete it.
