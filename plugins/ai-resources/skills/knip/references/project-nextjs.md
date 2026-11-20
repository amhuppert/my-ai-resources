# Knip with Next.js 15+

Load for Next.js 15 or newer (App Router). Older Pages-Router-only setups are out of scope.

## What knip auto-detects

When `next` is in `package.json`, the Next.js plugin enables automatically and registers:

- Config: `next.config.{js,ts,cjs,mjs}`
- App Router entries (root or `src/app/`): `layout`, `page`, `route`, `template`, `default`, `loading`, `error`, `not-found`, `global-error`, plus metadata files (`favicon.ico`, `icon.*`, `apple-icon.*`, `opengraph-image.*`, `twitter-image.*`, `sitemap.ts`, `robots.ts`, `manifest.ts`)
- Top-level entries (root or `src/`): `middleware.{ts,js}` (`middleware`, `config`) and `instrumentation.{ts,js}` (`register`, `onRequestError`)

Parallel routes (`@modal/`) and intercepting routes (`(.)photo/`) use standard App Router filenames and work automatically.

## Never override `next.entry` to add one file

Putting `entry` or `config` inside `"next": { ... }` replaces every auto-detected App Router pattern instead of merging. Add extra entries (custom `server.ts`, config helpers, seed scripts, edge functions) at the **top-level `entry`** array (or inside the workspace block in a monorepo, since top-level `entry` is ignored when workspaces exist):

```json
{
  "entry": ["server.ts!", "scripts/seed.ts", "edge-functions/*.ts!"]
}
```

## Server Actions (`'use server'`)

Client components invoke Server Actions through a runtime reference rather than always leaving a traceable static call graph:

1. **Preferred:** colocate Server Actions with the component importing them so knip sees the static import.
2. **Dedicated `actions/` modules:** tag exported actions with `/** @public */` and add `"tags": ["-public"]` in `knip.json` (see [`exports-advanced.md`](exports-advanced.md)).

## Route handlers, middleware, and `next/dynamic`

- `app/**/route.{ts,js}` exports (`GET`, `POST`, `runtime`, `dynamic`, `revalidate`, etc.) are treated as entry exports automatically. Helper modules must be imported or re-exported by a `route.ts` or they will be flagged.
- Verify non-standard `instrumentation*.ts` paths (such as Nx layouts) with `npx knip --debug` and add to `entry` if missed.
- Static `next/dynamic(() => import("./Heavy"))` resolves automatically. Computed template strings (`import(\`./widgets/${name}\`)`) cannot be traced statically; list the target glob in top-level `entry` (`"src/widgets/*.tsx"`).

## Packages commonly needing `ignoreDependencies`

Verify the package is actually used before adding it:

- `sharp`: Next.js image optimization runtime dependency (never imported in app code)
- `@next/bundle-analyzer`: used via `next.config.ts`
- `cross-env`, `dotenv-cli`: invoked from npm scripts
- `eslint-config-next`: referenced by string in ESLint config
- `@vercel/og`: check if flagged when used indirectly

```json
{ "ignoreDependencies": ["sharp", "@next/bundle-analyzer"] }
```

If the project also uses Tailwind, Storybook, Jest, or Bun, load those project references as well.
