# Knip configuration patterns

Rules for writing or auditing `knip.json`, `knip.jsonc`, or `knip.config.ts`.

## 1. Start from a zero-config baseline

Run `npx knip --debug` before writing custom rules. Inspect the enabled plugins, detected entry points, and resolved workspaces; plugins already cover most standard projects. Start with the minimal file and add keys only for real issues the baseline exposed:

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json"
}
```

Use `"https://unpkg.com/knip@5/schema-jsonc.json"` for `knip.jsonc`. Including `$schema` surfaces typos immediately in editors.

## 2. Separate `entry` from `project`

- `entry`: root files knip traces *from*. Anything reachable from an entry is considered used; entries themselves are never flagged unused.
- `project`: files knip considers *in scope*. Any file in `project` unreachable from `entry` is flagged unused.

```json
// Bad: marking every file as an entry hides all dead code
{ "entry": ["src/**/*.ts"], "project": ["src/**/*.ts"] }

// Good: real roots in entry, everything else in project
{ "entry": ["src/index.ts", "src/cli.ts"], "project": ["src/**/*.ts", "!src/**/*.test.ts"] }
```

Usually you do not need custom `entry` globs at all because plugins auto-detect them. When adding a missing entry, put it at the top level rather than inside a plugin block (`next.entry`, `jest.entry`): plugin-level `entry` and `config` options **replace** plugin defaults instead of merging.

## 3. Avoid bare `ignore`; use targeted suppressions

Bare `"ignore": ["src/generated/**"]` silences every issue type (files, exports, dependencies, unresolved imports). Pick the narrowest tool instead:

| Option | Silences only |
| --- | --- |
| `ignoreFiles` | Unused file reports for matching paths |
| `ignoreDependencies` | Unused dependency reports for package names |
| `ignoreBinaries` | Missing CLI binaries |
| `ignoreMembers` | Unused class or enum members |
| `ignoreUnresolved` | Unresolved import specifiers |
| `ignoreExportsUsedInFile` | Exports consumed only within the declaring file |

Use `!` negation inside `entry` or `project` arrays to exclude specific globs from one array (for example `"project": ["src/**/*.ts", "!src/**/*.generated.ts"]`).

## 4. Plugins, path aliases, `.gitignore`, and Node builtins

- **Plugins:** knip enables plugins from `package.json`. Override only to disable a mismatched plugin (`"webpack": false`) or point at a non-standard config path (`"next": { "config": "config/next.config.ts" }`). Never copy default plugin entries by hand.
- **Path aliases:** knip reads `tsconfig.json` `paths` automatically. Add `paths` in `knip.json` only for bundler-only aliases (Vite/webpack) not present in tsconfig, or pass `--tsConfig path/to/tsconfig.json` if tsconfig is not at root.
- **`.gitignore`:** knip honors `.gitignore` automatically; do not list `node_modules`, `dist`, `build`, `coverage`, or `.git`.
- **Node builtin collisions:** if an npm dependency shares a name with a Node builtin (`buffer`, `process`, `stream`), imports resolve to the builtin and knip flags the npm package. Add colliding packages to `ignoreDependencies`.

## 5. Production markers (`!`)

Append `!` to shipping entries (`"entry": ["src/index.ts!", "src/cli.ts!"]`) so `npx knip --production` analyzes only code shipped to users without needing `ignore` hacks for tests or stories.

## 6. Recommended default starter and `ignoreExportsUsedInFile`

```jsonc
{
  "$schema": "https://unpkg.com/knip@5/schema-jsonc.json",
  "ignoreExportsUsedInFile": {
    "interface": true,
    "type": true
  }
}
```

Ignoring same-file exported types and interfaces eliminates the most common noise without hiding dead runtime code.

Extend `ignoreExportsUsedInFile` to `"const": true` and `"function": true` only when the repo deliberately exports small internal building blocks (such as composed Zod sub-schemas) that are used solely within their own file. Leave `const` and `function` off if you want dangling internal exports cleaned up instead of silenced.
