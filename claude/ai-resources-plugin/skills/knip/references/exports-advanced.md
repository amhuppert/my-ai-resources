# Knip: advanced export handling

Use this reference when knip flags exports that look live or when you need to trace export chains before deleting.

## Decision order for a flagged export

1. **Part of a published/public API or runtime framework hook?** Tag with JSDoc `@public` and configure `"tags": ["-public"]`.
2. **Used only inside its own file?** Configure `ignoreExportsUsedInFile` (type-only or full).
3. **Private app or internal monorepo workspace where entry exports should be checked?** Enable `"includeEntryExports": true`.
4. **Loaded via dynamic import, config string, or plugin convention?** Add the consumer to `entry`, or tag the export `@public`.
5. **Referenced only via external library types?** Verify with `--include-libs --trace-export <Name>`, then tag `@public`.
6. **None of the above?** Trace to confirm, then delete or un-export it.

## JSDoc tagging (`@public` / `@internal`)

```ts
/**
 * Public API or runtime-invoked Server Action.
 * @public
 */
export const formatDate = (d: Date) => d.toISOString();
```

```json
{ "tags": ["-public"] }
```

The `-` prefix excludes `@public`-tagged exports from unused reports. You can invert the policy with `"+internal"` to report only exports marked `@internal`.

## `includeEntryExports` for private packages

By default knip skips unused exports inside entry files (safe for published libraries). For private apps or internal workspaces, enable checking entry exports:

```json
{
  "workspaces": {
    "packages/internal-lib": { "includeEntryExports": true },
    "packages/public-sdk": { "includeEntryExports": false }
  }
}
```

## `ignoreExportsUsedInFile`

Silences exports that are referenced within the same file (for example helpers exported for unit tests or composed local schemas):

```json
// Safe default across almost every repo
{ "ignoreExportsUsedInFile": { "interface": true, "type": true } }

// Broader (also silences same-file exported functions and consts)
{ "ignoreExportsUsedInFile": true }
```

## Tracing and barrels

Knip follows re-export barrels (`export * from "./utils"`). Before deleting anything that feels suspicious, trace it directly:

```bash
npx knip --trace-export formatDate
npx knip --trace-file src/utils/date.ts
npx knip --trace-dependency lodash
```

`npx knip --fix --fix-type exports` safely prunes unused specifiers inside re-export lines (`export { used, unused } from "./x"`).

## Class members and `--include-libs`

- **Class members:** off by default (lifecycle methods and interface implementations create noise). Opt in via `npx knip --include classMembers --exclude enumMembers` or `"rules": { "classMembers": "error" }`.
- **`--include-libs`:** walks `node_modules` `.d.ts` files to uncover type-only consumption by third-party libraries. Too slow for default runs; combine with tracing for targeted checks: `npx knip --include-libs --trace-export PluginConfig`.
