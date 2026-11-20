# TypeScript configuration performance reference

Option syntax, tradeoffs, diagnostic commands, and type-level patterns that affect `tsc` speed, memory, and watch overhead.

## Watch mode (`watchOptions`)

`watchOptions` controls how `tsc --watch` monitors files and has the largest impact on CPU and open-watcher limits.

```jsonc
"watchOptions": {
  "watchFile": "useFsEvents",
  "watchDirectory": "useFsEvents",
  "fallbackPolling": "dynamicPriorityPolling",
  "excludeDirectories": ["**/node_modules", "dist", "build", ".next", "coverage"]
}
```

- **`excludeDirectories`:** highest-impact watch setting (often cuts 90%+ of watchers by skipping `node_modules`). Independent from top-level `exclude`: `tsc` still loads types from these directories at startup, it just stops watching them. Paths resolve relative to cwd rather than tsconfig location, so prefer `**/` globs.
- **`watchFile` / `watchDirectory`:** `useFsEvents` uses OS-native events (low CPU, best default). `useFsEventsOnParentDirectory` uses even fewer watchers on huge trees with slightly coarser granularity. `dynamicPriorityPolling` is the best `fallbackPolling` option when OS events fail; avoid `fixedPollingInterval` unless FS events are broken.

## Type checking and program size

### `skipLibCheck`

```jsonc
{ "compilerOptions": { "skipLibCheck": true } }
```

Skips type-checking `.d.ts` files (both project and `node_modules/@types`). High speedup with many dependencies. Tradeoff: misses errors inside declaration files or conflicts between `@types` packages. `skipDefaultLibCheck: true` skips only TypeScript's built-in `lib.d.ts` files.

### `types` array

```jsonc
{ "compilerOptions": { "types": ["node", "jest"] } }
```

By default, TypeScript loads every `@types/*` package found in `node_modules`. Restricting `types` trims program construction time in monorepos or dependency-heavy repos, but requires manual updates whenever a new global `@types` package is added. Recommend only when `--listFilesOnly` or `--explainFiles` proves irrelevant `@types` are being loaded.

### `exclude` patterns

```jsonc
{
  "exclude": ["**/node_modules", "**/.*", "dist", "build", "coverage"]
}
```

Defining any `exclude` entry overrides TypeScript's default `node_modules` exclusion, so always keep `**/node_modules` listed. Excluding test files from the main config (paired with a `tsconfig.test.json`) trims main-program size.

## Build speed

- **`incremental` + `tsBuildInfoFile`:** caches compiler state so rebuilds only re-check changed files and dependents. Point `tsBuildInfoFile` into the build output directory (e.g., `./dist/.tsbuildinfo`) and gitignore it. Enabled automatically when `composite: true`.
- **`isolatedModules: true`:** enforces single-file transpilation (no cross-file `const enum` inlining or namespace merging), enabling fast transpilers (esbuild, SWC, Babel) for emit while `tsc` checks types. Already standard in Vite, Next.js, and Expo.
- **`isolatedDeclarations: true` (TS 5.5+):** requires explicit type annotations on all exports so `.d.ts` generation runs in parallel without type checking (up to ~3x faster emit when paired with `noCheck`).
- **`noCheck: true` (TS 5.6+):** skips type checking during emit so pipelines can split `tsc --noCheck` (fast emit) and `tsc --noEmit` (checking) in parallel with separate `tsBuildInfoFile` paths. Keep type checking enforced in CI.

## Monorepos: project references and editor memory

For monorepos with roughly 5 to 20 packages, composite project references split one massive program into cached units rebuilt via `tsc --build`:

```jsonc
// Root tsconfig.json
{ "references": [{ "path": "./packages/core" }, { "path": "./packages/ui" }] }

// Package tsconfig.json
{ "compilerOptions": { "composite": true, "declaration": true, "declarationMap": true } }
```

For large monorepos where the IDE language server (`tsserver`) runs out of memory (these flags do not affect CLI `tsc` builds):

| Flag | Effect | Tradeoff |
| --- | --- | --- |
| `disableReferencedProjectLoad` | Delays loading all referenced projects at startup | "Find All References" may be incomplete across projects |
| `disableSolutionSearching` | Excludes project from cross-project solution search | Breaks some cross-project navigation |
| `disableSourceOfProjectReferenceRedirect` | Reads emitted `.d.ts` files instead of source | Loses "Go to Source" into referenced packages |

## Code patterns affecting compiler speed

- Prefer `interface Foo extends Bar, Baz {}` over `type Foo = Bar & Baz`: interfaces create a single cached object type.
- Avoid very large union types (>12 complex members): union comparison scales quadratically.
- Add explicit return type annotations on complex exported functions to cut inference work.
- Name intermediate complex conditional types as type aliases so TypeScript can cache them.

## Diagnostic commands

```bash
tsc --extendedDiagnostics                 # timing, file count, memory breakdown
tsc --listFilesOnly                       # every file included in the program
tsc --explainFiles                        # why each file was pulled in
tsc --generateTrace ./trace-output        # Chrome DevTools trace
npx @typescript/analyze-trace ./trace-output
```

## Native TypeScript port (`tsgo`)

TypeScript's Go rewrite (`@typescript/native-preview` / `tsgo`, targeting TypeScript 7) uses the same CLI surface as `tsc` and offers roughly an order-of-magnitude speedup on type checking. Verify current feature parity (declaration emit, `--build`, JSX/downlevel emit) before recommending it for production builds.

## Payoff summary

| Optimization | Impact | Effort |
| --- | --- | --- |
| `watchOptions.excludeDirectories` | High (fewer watchers and CPU) | Trivial |
| `skipLibCheck: true` | High (skips `.d.ts` checks) | Trivial |
| `incremental: true` | High (faster rebuilds) | Trivial |
| `watchFile: "useFsEvents"` | Medium-high | Trivial |
| `isolatedModules: true` | Medium-high (unlocks fast transpilers) | Minor fixes |
| `exclude` cleanup | Medium | Low |
| Project references | High (large monorepos) | High setup |
| `isolatedDeclarations` + `noCheck` | High (parallel emit/check) | Annotation discipline |
| `disableReferencedProjectLoad` | Medium (editor memory) | Navigation tradeoff |
