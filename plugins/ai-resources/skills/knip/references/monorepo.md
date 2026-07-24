# Monorepos and Workspaces

Load this BEFORE running knip in any project with workspaces (`workspaces` array, `pnpm-workspace.yaml`, `turbo.json`, `nx.json`). Monorepo misconfiguration cascades into hundreds of false positives.

## How knip detects workspaces

Knip auto-detects from these sources, in priority order:

1. `workspaces` array in root `package.json` (npm, Bun, Yarn, Lerna)
2. `packages` array in `pnpm-workspace.yaml` (pnpm)
3. Legacy `workspaces.packages` in `package.json`
4. The `workspaces` object in knip config (manual override)

Every workspace must have a `package.json`. If a directory lacks one, knip skips it.

## The root workspace gotcha

**In a project with workspaces, top-level `entry` and `project` options are ignored.** This is the most common monorepo mistake.

Wrong (root-level scripts never analyzed):

```json
{
  "entry": ["scripts/*.ts"],
  "project": ["scripts/**/*.ts"],
  "workspaces": {
    "packages/*": {}
  }
}
```

Right (use `"."` as the root workspace key):

```json
{
  "workspaces": {
    ".": {
      "entry": ["scripts/*.ts"],
      "project": ["scripts/**/*.ts"]
    },
    "packages/*": {
      "entry": ["{index,cli}.ts"],
      "project": ["**/*.ts"]
    }
  }
}
```

Always configure `"."` if there is any code (build scripts, dev tooling, root-level entries) outside `packages/`.

## Use workspace globs, not per-package entries

Wrong (repeats the same config for every package):

```json
{
  "workspaces": {
    "packages/auth": { "entry": ["index.ts"] },
    "packages/api":  { "entry": ["index.ts"] },
    "packages/ui":   { "entry": ["index.ts"] }
  }
}
```

Right (one glob, with specific overrides where needed):

```json
{
  "workspaces": {
    "packages/*": {
      "entry": ["{index,main}.ts"],
      "project": ["src/**/*.ts", "!src/**/*.test.ts"]
    },
    "packages/cli": {
      "entry": ["bin/cli.ts"]
    }
  }
}
```

Workspaces matched by both a glob and a specific path: the specific path wins.

## Configure plugins per workspace when packages diverge

If one package uses Vitest and another uses Jest, configure them per-workspace:

```json
{
  "workspaces": {
    "packages/app": {
      "vitest": true,
      "jest": false
    },
    "packages/api": {
      "jest": { "config": "jest.config.ts" }
    },
    "packages/shared": {
      "vitest": true
    }
  }
}
```

Set a plugin to `false` to disable an auto-detected plugin that doesn't apply to that workspace.

## Cross-workspace imports: declare them in `package.json`

Wrong (a path alias hops between workspaces, knip can't track it):

```jsonc
// root tsconfig.json
{ "paths": { "@packages/*": ["../*/src"] } }
```
```typescript
// packages/api/src/auth.ts
import { User } from '@packages/shared/types';
```

Right (use a real workspace dependency):

```jsonc
// packages/api/package.json
{
  "name": "@myorg/api",
  "dependencies": {
    "@myorg/shared": "workspace:*"
  }
}
```
```typescript
// packages/api/src/auth.ts
import { User } from '@myorg/shared/types';
```

This is the right pattern regardless of knip — it also makes the package-manager-level workspace link real and stops local-only resolution that breaks at publish time.

## Ignore workspaces you don't want to analyze

Useful for third-party forks, generated packages, or packages on the way out:

```json
{
  "ignoreWorkspaces": [
    "packages/legacy-fork",
    "packages/generated-api"
  ],
  "workspaces": {
    "packages/*": { "entry": ["index.ts"] }
  }
}
```

## Targeting a single workspace from CLI

`--workspace` / `-W` accepts a package name, glob, or directory path. Knip automatically pulls in ancestor and dependent workspaces so cross-workspace deps stay coherent.

```bash
npx knip --workspace @myorg/my-lib
npx knip --workspace './apps/*'
npx knip --workspace '@myorg/*' --workspace '!@myorg/legacy'
```

Use this for local debugging — narrowing scope makes runs much faster while iterating on one package.

## Strict / isolated workspace mode

Hoisting in the root `node_modules` lets a package import dependencies it has not declared in its own `package.json`. This breaks at publish time. Catch it locally:

```bash
npx knip --strict
# or, equivalently
npx knip --isolate-workspaces
```

In strict mode, each workspace's dependencies are checked against its **own** `package.json`, not the root. Phantom deps are reported as unlisted.

Recommended CI pattern: a default `npx knip` check (any-mode, any-workspace) plus a strict production check (`npx knip --production --strict`). See [`ci-integration.md`](ci-integration.md).

## Quick monorepo checklist

When you first run knip in a monorepo:

1. Verify auto-detection: `npx knip --debug` and confirm every expected workspace appears.
2. Add `"."` to `workspaces` if there is any root-level code.
3. If a workspace uses a different test runner / bundler / etc., set per-workspace plugin config.
4. Replace any cross-workspace path aliases with real `workspace:*` deps.
5. Add `ignoreWorkspaces` for packages you intentionally don't want analyzed.
6. Add `--strict` to your CI run once the default run is clean.
