# TypeScript Configuration Performance Reference

## watchOptions

Controls how `tsc --watch` detects file changes. These settings are the highest-impact optimizations for developer experience.

### excludeDirectories

Prevents tsc from placing inotify/FSEvents watchers on specified directories. This is the single most impactful watch setting — a typical project has 10,000+ directory watchers inside `node_modules` alone.

```jsonc
"watchOptions": {
  "excludeDirectories": ["**/node_modules", "dist", "build", ".next", "coverage"]
}
```

- Separate from top-level `exclude` (which controls program inclusion, not watching)
- tsc still resolves types from excluded directories at startup; it just won't watch them for changes
- Paths resolve relative to cwd, not tsconfig location — use `**/*` glob patterns to be safe

### watchFile

Controls how individual files are monitored.

| Strategy | Mechanism | CPU Cost | Notes |
|----------|-----------|----------|-------|
| `useFsEvents` | `fs.watch()` per file | Low (event-driven) | Best default for macOS/Linux/Windows |
| `useFsEventsOnParentDirectory` | `fs.watch()` on parent dirs | Lowest | Good for very large codebases; slightly less precise |
| `dynamicPriorityPolling` | Adaptive polling queue | Medium | Frequently modified files polled more often |
| `fixedPollingInterval` | `fs.watchFile()` at fixed rate | Highest | Only when FS events are broken |

### watchDirectory

Controls how directories are monitored for new file creation.

- `useFsEvents` — best default (requires OS support for recursive watching)
- Polling strategies available as fallback

### fallbackPolling

Used when `fs.watch()` fails. `dynamicPriorityPolling` is the best choice — adapts frequency based on file change patterns.

### Recommended watchOptions

```jsonc
"watchOptions": {
  "watchFile": "useFsEvents",
  "watchDirectory": "useFsEvents",
  "fallbackPolling": "dynamicPriorityPolling",
  "excludeDirectories": ["**/node_modules", "dist", "build", ".next", "coverage"]
}
```

## Type Checking Speed

### skipLibCheck

```jsonc
{ "compilerOptions": { "skipLibCheck": true } }
```

Skips type-checking of all `.d.ts` files (both project-authored and from `node_modules/@types`). Significant speedup with many dependencies.

- Tradeoff: won't catch type errors in declaration files or conflicts between `@types` packages
- For partial checking, `skipDefaultLibCheck: true` skips only TypeScript's built-in `lib.d.ts` files

### types Array

```jsonc
{ "compilerOptions": { "types": ["node", "jest"] } }
```

By default, TypeScript auto-includes every `@types/*` package visible in `node_modules`. Setting `types` to a specific list prevents unnecessary type packages from being loaded — reduces program construction time.

- Tradeoff: must be kept in sync manually; missing entries cause confusing "cannot find type" errors when adding new dependencies
- Best used in monorepos where `@types` packages from sibling packages leak in, or when there are clearly irrelevant `@types` installed

### exclude Patterns

```jsonc
{
  "exclude": ["**/node_modules", "**/.*", "dist", "build", "coverage"]
}
```

- Once any `exclude` entry is defined, `node_modules` is no longer automatically excluded — always include it explicitly
- Excluding test files from the main tsconfig reduces program size (use a separate `tsconfig.test.json` if needed)

## Build Speed

### incremental

```jsonc
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

Saves compiler state to disk for faster rebuilds — subsequent builds only re-check changed files and dependents. Place `.tsbuildinfo` in the build output directory and gitignore it. Automatically enabled when `composite: true`.

### isolatedModules

```jsonc
{ "compilerOptions": { "isolatedModules": true } }
```

Ensures each file can be transpiled independently (no cross-file const enum inlining, no namespace merging). Enables using fast transpilers (SWC, esbuild, Babel) for emit while tsc only does type checking. Already required by many modern tools (Vite, Next.js, Expo).

### isolatedDeclarations (TypeScript 5.5+)

```jsonc
{ "compilerOptions": { "isolatedDeclarations": true } }
```

Requires explicit type annotations on all exports. Enables parallel `.d.ts` generation without type checking. Combined with `noCheck`, gives maximum build parallelism — up to 3x build time improvement.

- Tradeoff: requires annotation discipline on all exported functions, variables, etc.

### noCheck (TypeScript 5.6+)

```jsonc
{ "compilerOptions": { "noCheck": true } }
```

Skips type checking while still emitting JS output. Use case: split builds into `tsc --noCheck` (fast emit) + `tsc --noEmit` (type checking), run in parallel with separate `tsBuildInfoFile` paths.

- Development speed optimization only — still need type checking in CI

## Project References (Monorepos)

```jsonc
// Root tsconfig.json
{ "references": [{ "path": "./packages/core" }, { "path": "./packages/ui" }] }

// packages/core/tsconfig.json
{ "compilerOptions": { "composite": true, "declaration": true, "declarationMap": true } }
```

Splits one large program into smaller projects. Each is checked independently, reducing per-project memory footprint. `tsc --build` only rebuilds changed projects.

- Sweet spot: 5-20 projects
- Tradeoff: significant configuration complexity

## Editor/tsserver Memory (Large Monorepos)

These flags affect the language server only, not `tsc` command-line builds.

| Flag | Effect | Tradeoff |
|------|--------|----------|
| `disableReferencedProjectLoad` | Prevents loading all referenced projects at once | "Find All References" may be incomplete across projects |
| `disableSolutionSearching` | Opts project out of solution search | Can break cross-project navigation |
| `disableSourceOfProjectReferenceRedirect` | Uses `.d.ts` output instead of source files | Lose "go to source" for referenced projects |

## Code Patterns That Affect Performance

- **Interfaces over type intersections**: `interface Foo extends Bar, Baz {}` creates a single flat cached object type; `type Foo = Bar & Baz` does not
- **Avoid large unions (>12 members)**: Union comparison is quadratic; use base type + inheritance instead
- **Explicit return type annotations**: Reduces inference work, especially on exported functions
- **Break up complex conditional types**: Extract into named type aliases for caching

## Diagnostic Commands

```bash
# Detailed timing breakdown
tsc --extendedDiagnostics

# See which files are included and why
tsc --listFilesOnly
tsc --explainFiles

# Generate trace for Chrome DevTools (chrome://tracing)
tsc --generateTrace ./trace-output

# Analyze trace hotspots
npx @typescript/analyze-trace ./trace-output

# Count file watchers for a running tsc process (Linux)
# Requires inotifywait or /proc/PID/fdinfo inspection
```

## Future: TypeScript Native Port (tsgo)

The TypeScript compiler is being rewritten in Go (project "Corsa", shipping as TypeScript 7). Available now as `@typescript/native-preview` with a `tsgo` CLI — same CLI API as `tsc`. Benchmarks show ~10x faster type checking. Current gaps: declaration emit, full `--build` parity, some JSX/downlevel emits.

## Impact Summary (Ordered by Payoff)

| Setting | Impact | Effort |
|---------|--------|--------|
| `watchOptions.excludeDirectories` | High — fewer watchers, less CPU | Trivial |
| `skipLibCheck: true` | High — skips all `.d.ts` checking | Trivial |
| `incremental: true` | High — only re-checks changes | Trivial |
| `watchFile: "useFsEvents"` | Medium-High — event-driven vs polling | Trivial |
| `isolatedModules: true` | Medium-High — enables fast transpilers | Minor code changes |
| `exclude` patterns | Medium — smaller program | Maintain list |
| Project references | High for monorepos | Significant setup |
| `isolatedDeclarations` + `noCheck` | High — 3x build improvement | Annotation discipline |
| `disableReferencedProjectLoad` | Medium for editors | Loses some cross-project features |
