# Knip Configuration Patterns

The full set of configuration rules to apply when authoring or reviewing a `knip.json` / `knip.config.ts`. Load this when SKILL.md says to.

## 1. Establish a baseline before configuring

Run knip with **no config** first to see what it auto-detects.

```bash
npx knip --debug
```

The `--debug` flag lists enabled plugins, detected entry points, and resolved workspace configs. Read this output before adding any custom config — most of what you might write by hand is already covered by plugin defaults.

Then create the minimum viable config:

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json"
}
```

Add settings only to fix specific issues that the baseline run surfaced, not preemptively.

## 2. Always include the JSON schema

The `$schema` field gives IDE autocompletion and validates keys/types so typos surface at edit time rather than runtime.

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json"
}
```

For JSONC (comments allowed):

```jsonc
{
  "$schema": "https://unpkg.com/knip@5/schema-jsonc.json",
  // Entry points
  "entry": ["src/index.ts"]
}
```

## 3. Separate `entry` from `project`

These two fields do different things and confusing them is the most common source of false positives.

- **`entry`** — the starting points knip traces *from*. Anything reachable from an entry is considered used. Files in `entry` are themselves never reported unused.
- **`project`** — the set of files knip considers *in scope* to be reported. Files in `project` that are **not reachable from any entry** are reported as unused.

Wrong (everything is an entry, so nothing is ever unused):

```json
{
  "entry": ["src/**/*.ts"],
  "project": ["src/**/*.ts"]
}
```

Right (entries are the true roots; project covers everything in scope):

```json
{
  "entry": ["src/index.ts", "src/cli.ts"],
  "project": ["src/**/*.ts", "!src/**/*.test.ts"]
}
```

In most projects you should not have a custom `entry` at all — the auto-detected plugin entries are usually correct. Add custom `entry` only when knip cannot find a real entry point on its own (e.g., a non-standard server.ts, a script invoked by a hook, etc.).

**Important:** Custom `config` and `entry` options on a plugin **override** the plugin's defaults — they do not merge. If you customize `next.entry`, you lose every auto-detected Next.js entry. Prefer adding entries at the top level rather than inside a plugin block.

## 4. Never use the broad `ignore` field

The `ignore` field silences **all** issue types for matching paths — unused files, unused exports, unused dependencies, missing dependencies, unresolved imports. It is too broad and almost always wrong.

Wrong (hides real issues in generated code):

```json
{ "ignore": ["src/generated/**"] }
```

Right options, by issue type:

| Field | What it silences |
|---|---|
| `ignoreFiles` | Only "unused file" reports for matching paths |
| `ignoreDependencies` | Only "unused dependency" reports for listed package names |
| `ignoreBinaries` | Missing binaries |
| `ignoreMembers` | Class / enum members |
| `ignoreUnresolved` | Unresolved imports |
| `ignoreExportsUsedInFile` | Exports used only within their own file (`true`, or `{ interface: true, type: true }`) |

Or, scope an exclusion to a specific entry/project pattern with `!`:

```json
{
  "entry": ["src/**/*.ts", "!src/generated/**/*.ts"],
  "project": ["src/**/*.ts", "!src/**/*.generated.ts"]
}
```

Use negation patterns for **per-array** scoping; use the `ignore*` fields for **per-issue-type** scoping. Never use the bare `ignore` field unless you've ruled out both.

## 5. Enable or disable plugins explicitly when needed

Knip auto-enables plugins by inspecting `package.json` dependencies. You only need to touch a plugin when:

- You want to **disable** an auto-detected plugin (`"webpack": false`).
- You need to **override** its detected config path because the file lives somewhere unusual.
- The auto-detected entries miss a real entry point in your project.

Disabling:

```json
{ "webpack": false, "rollup": false }
```

Overriding a config path:

```json
{ "next": { "config": "config/next.config.ts" } }
```

Do **not** write out the default plugin entries — you'll be re-stating what the plugin already does, and any future plugin update won't apply to you.

## 6. Path aliases

Knip reads `paths` from `tsconfig.json` automatically. You only need to set `paths` in knip's own config when:

- The project uses path aliases that are not in tsconfig (e.g., bundler-only aliases in `vite.config.ts` or `webpack.config.js`).
- `tsconfig.json` is not at the project root.

When you do set them, use tsconfig syntax:

```json
{
  "paths": {
    "@lib": ["./src/lib/index.ts"],
    "@lib/*": ["./src/lib/*"],
    "@components/*": ["./src/components/*"]
  }
}
```

If tsconfig is the source of truth and lives somewhere unusual, point knip at it:

```bash
npx knip --tsConfig path/to/tsconfig.json
```

## 7. Don't restate what `.gitignore` already covers

Knip respects `.gitignore`. Listing `node_modules`, `dist`, `build`, `coverage`, `.git`, etc. in any ignore field is redundant — remove them.

## 8. Handle Node.js builtin-name collisions

If a dependency shares a name with a Node.js builtin module (`buffer`, `process`, `path`, `stream`, etc.), knip may not detect its use because imports of `import buf from 'buffer'` resolve to the builtin. Add the colliding package to `ignoreDependencies`:

```json
{ "ignoreDependencies": ["buffer", "process"] }
```

## 9. Production-mode markers (`!` suffix)

Mark entries that are part of shipping code (not tests, not dev tooling) with a trailing `!`:

```json
{
  "entry": [
    "src/index.ts!",
    "src/cli.ts!"
  ]
}
```

Then `npx knip --production` only analyzes those marked entries. This is the right way to exclude tests/stories from a "shipping code" analysis — never use `ignore` for that.

## 10. Minimal "default for a real project" template

A reasonable starting point that covers the rules above:

```jsonc
{
  "$schema": "https://unpkg.com/knip@5/schema-jsonc.json",
  // Plugins are auto-detected from package.json. Only override when needed.
  "ignoreExportsUsedInFile": {
    "interface": true,
    "type": true
  }
}
```

`ignoreExportsUsedInFile: { interface: true, type: true }` is the single most useful default — it eliminates the common "I exported a type but only used it in this file" noise without hiding real export issues.

### When to extend to `const` and `function`

The option also accepts `const` and `function` keys. Enable them when the codebase has a recognizable pattern of **internal-only composition**:

```jsonc
{
  "ignoreExportsUsedInFile": {
    "interface": true,
    "type": true,
    "const": true,      // e.g., sub-schemas exported and only used inside the same file
    "function": true    // e.g., helpers exported and only used inside the same file
  }
}
```

Indicators that this is the right move:
- The default run reports many "unused export" findings on `const`s that are immediately used within their own file to compose a larger export (e.g., `HooksSchema` exported then used in `ClaudeCodeSettingsSchema`).
- The codebase intentionally splits a file's surface into many small named pieces for readability even though only one or two of them are imported externally.

Indicators that this is the **wrong** move:
- The findings represent genuinely dead helpers that happen to only be referenced inside their own file.
- You'd rather force the cleanup of those dangling internal-only exports than hide them.

If unsure, leave `const`/`function` off — false positives are easier to deal with one-at-a-time than false negatives that quietly leave dead code in place.
