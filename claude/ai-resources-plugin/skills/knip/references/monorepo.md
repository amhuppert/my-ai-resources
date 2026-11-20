# Knip in monorepos and workspaces

Load this before running knip in any repository using npm/Yarn/Bun `workspaces`, `pnpm-workspace.yaml`, Turborepo, or Nx.

## Workspace detection

Knip discovers workspaces in this order:

1. `workspaces` array in root `package.json` (npm, Bun, Yarn, Lerna)
2. `packages` array in `pnpm-workspace.yaml` (pnpm)
3. Legacy `workspaces.packages` in `package.json`
4. Explicit `workspaces` map in `knip.json`

Every workspace directory must contain its own `package.json`; directories without one are skipped. Run `npx knip --debug` first to confirm every expected workspace appears.

## Root workspace trap (`"."`)

When workspaces exist, top-level `entry` and `project` fields in `knip.json` are ignored. Put root-level scripts and tooling under the `"."` workspace key:

```json
{
  "workspaces": {
    ".": {
      "entry": ["scripts/*.ts"],
      "project": ["scripts/**/*.ts"]
    },
    "packages/*": {
      "entry": ["{index,cli}.ts"],
      "project": ["src/**/*.ts", "!src/**/*.test.ts"]
    },
    "packages/cli": {
      "entry": ["bin/cli.ts"]
    }
  }
}
```

Use workspace globs (`packages/*`) with targeted per-package overrides; an exact path overrides the glob.

## Divergent per-workspace plugins

When workspaces use different tools (such as Vitest in one package and Jest in another), configure plugins inside each workspace block and set inapplicable plugins to `false`:

```json
{
  "workspaces": {
    "packages/app": { "vitest": true, "jest": false },
    "packages/api": { "jest": { "config": "jest.config.ts" } }
  }
}
```

## Cross-workspace imports

Knip cannot track cross-workspace `tsconfig` path aliases (`"@packages/*": ["../*/src"]`). Declare real workspace dependencies in each consumer's `package.json` (`"@myorg/shared": "workspace:*"`) and import by package name. This also avoids publish-time resolution failures.

## Ignoring workspaces and scoping runs

Skip generated packages or forks with `"ignoreWorkspaces": ["packages/legacy-fork", "packages/generated-api"]`.

Narrow local debugging to one or more packages with `--workspace` / `-W` (knip automatically pulls in ancestor and dependent workspaces):

```bash
npx knip --workspace @myorg/my-lib
npx knip --workspace './apps/*' --workspace '!./apps/legacy'
```

## Catching phantom hoisted dependencies (`--strict`)

Hoisted root `node_modules` lets packages import undeclared dependencies that break when published or isolated. Run `npx knip --strict` (alias `--isolate-workspaces`) to check every workspace strictly against its own `package.json`. Note that `--strict` implies `--production`. In CI, pair `npx knip` with `npx knip --strict` (see [`ci-integration.md`](ci-integration.md)).
