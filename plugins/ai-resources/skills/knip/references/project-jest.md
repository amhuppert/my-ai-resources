# Jest Projects

Jest auto-detection is solid for standard setups. Issues come from non-standard config formats (especially `.mjs`), string-referenced transformers/reporters, and custom test runners.

## Auto-detection

The Jest plugin activates when `jest` is in `dependencies` or `devDependencies`.

When activated, it auto-detects:

- **Config files:** `jest.config.{js,ts,mjs,cjs,mts,cts,json}` and the `jest` key in `package.json`.
- **Test entries:**
  - `**/__tests__/**/*.[jt]s?(x)`
  - `**/?(*.)+(spec|test).[jt]s?(x)`
  - `**/__mocks__/**/*.[jt]s?(x)`

In a standard setup with `jest.config.ts` and `*.test.ts` files, you typically don't need any custom knip config for Jest.

## Production mode auto-excludes tests

Tests are devDependencies, not shipping code.

```bash
npx knip --production
```

…automatically excludes `__tests__/`, `*.test.*`, `*.spec.*`, `__mocks__/`, and Jest itself. Don't manually `ignore` test files — use production mode. Same canonical "two CI checks" pattern as Storybook ([`ci-integration.md`](ci-integration.md)).

## Known issue: `jest.config.mjs` and `ts-jest`

There's a [reported case](https://github.com/webpro-nl/knip/issues/675) where renaming `jest.config.js` to `jest.config.mjs` caused `ts-jest` to be reported as an unused devDependency. The root cause is that knip's plugin couldn't parse the `.mjs` config the same way it parses `.js` / `.ts`.

Verify on current knip version first. If still affected, fix with:

```json
{ "jest": { "config": ["jest.config.mjs"] } }
```

Or, swap back to `jest.config.ts` (which Jest 29+ supports natively).

## Transformers (ts-jest, babel-jest, @swc/jest)

Jest transformers are referenced from `transform` in the config:

```ts
// jest.config.ts
export default {
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    '^.+\\.jsx?$': 'babel-jest',
  },
};
```

Knip's plugin reads these string references in `.ts`/`.js` configs and reports the transformer as used. **If your config is `.mjs` or has computed/dynamic transformer references, knip may miss them** — verify and add to `ignoreDependencies` if needed:

```json
{ "ignoreDependencies": ["ts-jest", "babel-jest"] }
```

## `testEnvironment`, `setupFiles`, `globalSetup`, `globalTeardown`

These are also string references in the config. Knip's plugin generally reads them:

```ts
export default {
  testEnvironment: 'jest-environment-jsdom',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEach: ['<rootDir>/jest.aftereach.ts'],
  globalSetup: '<rootDir>/jest.global-setup.ts',
  globalTeardown: '<rootDir>/jest.global-teardown.ts',
};
```

Common environment packages that may need `ignoreDependencies` if not detected:

- `jest-environment-jsdom`
- `jest-environment-node`
- `@happy-dom/jest-environment`

If a setup file (`jest.setup.ts`) is reported as unused, knip didn't trace it through the config. Add it explicitly:

```json
{ "entry": ["jest.setup.ts", "jest.global-setup.ts"] }
```

## Reporters

Reporters are also string references:

```ts
reporters: ['default', 'jest-junit', ['jest-html-reporter', { /* ... */ }]],
```

If knip's plugin doesn't pick them up, `ignoreDependencies`:

```json
{ "ignoreDependencies": ["jest-junit", "jest-html-reporter"] }
```

## Custom test patterns

If your project uses non-standard test file names (e.g., `*.unit.ts`, `*.integration.ts`), Jest's auto-detected entries miss them. Configure explicitly:

```json
{
  "jest": {
    "config": ["jest.config.ts"],
    "entry": [
      "**/__tests__/**/*.ts",
      "**/*.{test,unit,integration}.ts",
      "**/__mocks__/**/*.ts"
    ]
  }
}
```

Remember: this **overrides** plugin defaults entirely (see [`config-patterns.md`](config-patterns.md) §3). Include every pattern you want.

## Mock files

`__mocks__/` directories are auto-detected. If you place mocks elsewhere (e.g., `test/mocks/`), declare them:

```json
{ "entry": ["test/mocks/**/*.ts"] }
```

Or use a `*.mock.ts` naming convention and add it to the test entry list.

## Jest in monorepos

In a monorepo where some packages use Jest and others use Vitest, configure per-workspace (see [`monorepo.md`](monorepo.md)):

```json
{
  "workspaces": {
    "packages/api": {
      "jest": { "config": "jest.config.ts" }
    },
    "packages/web": {
      "vitest": true,
      "jest": false
    }
  }
}
```

## Common false positives

| Reported unused | Likely cause | Fix |
|---|---|---|
| `ts-jest` / `babel-jest` / `@swc/jest` | `.mjs` config or dynamic transform reference | `ignoreDependencies` |
| `jest-environment-jsdom` | String reference in `testEnvironment` | Verify plugin detected it; else `ignoreDependencies` |
| `jest-junit` | Reporter string | `ignoreDependencies` |
| `jest.setup.ts` | Referenced from `setupFiles` array | Add to top-level `entry` |
| A test util file (e.g., `test/factories.ts`) | Imported only from tests; in default mode appears used | Should be detected unless test files are themselves excluded |

## Quick checklist for a Jest project

1. `npx knip --debug` — confirm the Jest plugin is enabled and your config file is detected.
2. Run a `--production` check too; tests should not appear there.
3. If using `jest.config.mjs` and seeing transformer false positives, set `jest.config` explicitly or convert to `.ts`.
4. For non-standard test file naming, set `jest.entry` (full list — overrides don't merge).
5. For setup files outside the config, add to top-level `entry`.
