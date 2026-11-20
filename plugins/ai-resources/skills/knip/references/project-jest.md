# Knip with Jest

## Auto-detection and production mode

When `jest` is in `package.json`, knip auto-detects `jest.config.{js,ts,mjs,cjs,mts,cts,json}`, `package.json#jest`, `__tests__/**/*.[jt]s?(x)`, `*.{spec,test}.[jt]s?(x)`, and `__mocks__/**/*.[jt]s?(x)`.

`npx knip --production` excludes tests, mocks, and Jest automatically. Do not use `ignore` to exclude tests.

## Common false positives and fixes

- **`jest.config.mjs` + `ts-jest` ([knip#675](https://github.com/webpro-nl/knip/issues/675)):** knip has historically parsed `.mjs` Jest configs less reliably than `.ts`/`.js`, flagging `ts-jest` or other transformers. Verify on your current knip version; fix by setting `{ "jest": { "config": ["jest.config.mjs"] } }`, switching to `jest.config.ts` (supported natively in Jest 29+), or adding the transformer to `ignoreDependencies`.
- **String-referenced transformers, environments, and reporters:** `ts-jest`, `babel-jest`, `@swc/jest`, `jest-environment-jsdom`, `@happy-dom/jest-environment`, `jest-junit`, and `jest-html-reporter` are usually parsed from `.ts`/`.js` configs. If dynamic config code hides them, add verified packages to `ignoreDependencies`.
- **Setup files (`jest.setup.ts`, `jest.global-setup.ts`):** if flagged unused, add them to top-level `entry`.
- **Custom mock folders or test filenames (`*.unit.ts`, `test/mocks/**`):** add custom mock globs to top-level `entry`. If overriding `jest.entry` for non-standard test suffixes, list **all** test globs (plugin overrides replace defaults instead of merging):
  ```json
  {
    "jest": {
      "config": ["jest.config.ts"],
      "entry": ["**/__tests__/**/*.ts", "**/*.{test,unit,integration}.ts", "**/__mocks__/**/*.ts"]
    }
  }
  ```

In monorepos mixing Jest and Vitest, enable/disable each plugin per workspace (see [`monorepo.md`](monorepo.md)).
