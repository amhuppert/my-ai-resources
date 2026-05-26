# Next.js 15+ Projects

Load this when the project uses Next.js 15 or newer. Earlier versions (Pages-Router-primary, pre-stable instrumentation, pre-stable Server Actions) are out of scope.

## What knip auto-detects

When `next` is in `dependencies` or `devDependencies`, the plugin enables automatically and recognizes:

- **Config:** `next.config.{js,ts,cjs,mjs}`
- **App Router entries** (at root or `src/app/`):
  - `layout`, `page`, `route`, `template`, `default`, `loading`, `error`, `not-found`, `global-error` files
  - Metadata files: `favicon.ico`, `icon.*`, `apple-icon.*`, `opengraph-image.*`, `twitter-image.*`, `sitemap.ts`, `robots.ts`, `manifest.ts`
- **Top-level Next.js entries** (at root or `src/`):
  - `middleware.{ts,js}`
  - `instrumentation.{ts,js}`

If a Next.js entry is missing from this list (e.g., a custom server file, a non-standard layout), you'll need to add it explicitly. See [Custom entries](#custom-entries) below.

## Critical caveat: overrides do not merge

Custom `config` or `entry` inside the `next:` plugin block in `knip.json` **completely replace** the defaults, they don't merge. So:

Wrong (silently loses every auto-detected app/layout, app/page, etc.):

```json
{
  "next": {
    "entry": ["src/app/(marketing)/page.tsx"]
  }
}
```

Right — add your custom entry at the top level instead:

```json
{
  "entry": ["src/app/(marketing)/page.tsx"]
}
```

Use plugin overrides only when you genuinely need to suppress the defaults (e.g., the framework's standard layout doesn't apply at all).

## Server Actions

Server Actions are functions marked `'use server'` and invoked by the client via a runtime reference, not a static import. Knip cannot statically prove they're used.

Two patterns:

**1. Co-locate actions with the component that calls them.** Knip then sees the import even though the runtime call is opaque. This is the cleanest pattern and the recommended Next.js style anyway.

**2. Tag dedicated action modules with `@public`.** When actions live in a shared `actions/` directory or similar:

```typescript
// app/actions/user.ts
'use server';

/**
 * Create a new user. Called via Server Action from client components.
 * @public
 */
export async function createUser(formData: FormData) { /* ... */ }
```

```json
{ "tags": ["-public"] }
```

See [`exports-advanced.md`](exports-advanced.md) for the full JSDoc tagging pattern.

## Route Handlers

Files at `app/**/route.{ts,js}` are auto-detected as entries. Their exports — `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`, `runtime`, `dynamic`, `revalidate`, etc. — are never reported unused because they sit in entry files.

**Watch out for:** non-standard route files. If you have a `lib/handlers.ts` re-exported by a `route.ts`, the re-exports are fine, but if any handler file is *not* re-exported through a `route.ts`, knip will flag it.

## Middleware and Instrumentation

- `middleware.ts` (root or `src/`): the exported `middleware` and `config` are not reported unused.
- `instrumentation.ts` (root or `src/`): the exported `register` and `onRequestError` are not reported unused.

If middleware or instrumentation live somewhere unusual (build-conditional location, multiple variants), add them to `entry`. There's a real-world report of `instrumentation*.ts` needing `ignoreFiles` overrides in an Nx setup — verify with `--debug` whether your file is being auto-detected first.

## `next/dynamic` and parallel/intercepting routes

`next/dynamic()` with a static import string (`dynamic(() => import('./Heavy'))`) is resolved correctly. With a computed path:

```typescript
const C = dynamic(() => import(`./widgets/${name}`));
```

…knip can't resolve it. Add the targets explicitly:

```json
{ "entry": ["src/widgets/*.tsx"] }
```

Parallel routes (`@modal/`) and intercepting routes (`(.)photo/`) use the standard `layout`/`page`/etc. files, so they're covered by the auto-detected patterns. No extra config needed unless the parallel slot uses a non-standard file structure.

## Common dependencies that need `ignoreDependencies`

Some Next.js ecosystem packages are referenced by config strings or runtime mechanisms, not direct imports. If knip flags them as unused but they really are in use:

- `sharp` — image optimization at build time, not imported from app code.
- `@next/bundle-analyzer` — used in `next.config.ts` `withBundleAnalyzer` wrapper.
- `cross-env` / `dotenv-cli` — invoked from npm scripts.
- `eslint-config-next` — referenced from `.eslintrc` by string.

```json
{ "ignoreDependencies": ["sharp", "@next/bundle-analyzer"] }
```

Verify the package isn't referenced *anywhere* before adding to this list.

## Custom entries

A non-exhaustive list of things you may need to add to top-level `entry`:

- Custom server file (`server.ts`, `server.js`) — Next 15+ rarely needs this, but it exists.
- Custom Next.js plugins / `next.config.ts` helper modules imported only from the config.
- Scripts invoked by `package.json` scripts that aren't an obvious binary entry (e.g., `scripts/seed.ts`).
- Workers or edge functions deployed outside the standard `app/` tree.

Example (root of `knip.json`):

```json
{
  "entry": [
    "server.ts!",
    "scripts/seed.ts",
    "edge-functions/*.ts!"
  ]
}
```

`!` markers participate in `--production` mode (see [`config-patterns.md`](config-patterns.md) §9).

## Monorepo: `apps/web/` layouts

If Next.js lives in a workspace (e.g., `apps/web/` in a Turborepo or Nx repo), the plugin should still detect it as long as that workspace has a `package.json` with `next` listed. See [`monorepo.md`](monorepo.md). Common gotcha: top-level `entry` in `knip.json` is **ignored in monorepo mode** — configure the per-workspace block instead:

```json
{
  "workspaces": {
    "apps/web": {
      "entry": ["scripts/seed.ts"]
    }
  }
}
```

## Quick checklist for a Next.js 15+ project

1. Run `npx knip --debug` and verify the Next.js plugin shows as enabled with all expected auto-entries.
2. If you have Server Actions in a dedicated `actions/` directory, set up `@public` JSDoc tagging.
3. Add `ignoreExportsUsedInFile: { interface: true, type: true }` to silence type-only same-file noise (see [`config-patterns.md`](config-patterns.md)).
4. If using Tailwind / Storybook / Jest alongside Next.js, also load the matching project reference.
5. For a published `@vercel/og` or `sharp`-using app, verify those packages aren't being reported as unused — add to `ignoreDependencies` if needed.
