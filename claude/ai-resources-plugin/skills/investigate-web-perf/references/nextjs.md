# Framework: Next.js

Load this reference when the project uses Next.js (any 13+ version; most guidance targets 15–16). Load `react.md` alongside this file.

## Tools Specific to Next.js

### `next-devtools-mcp`

Bridges the `/_next/mcp` dev-server endpoint (Next.js 16+). Surfaces:

- Live compile + runtime errors
- Route structure (which segments, which boundaries)
- Suspense boundary automation (Next 16.2+: experimental Agent DevTools for React component trees)
- Cache Components migration tools

Call these MCP tools *before* chrome-devtools-mcp when investigating build-time or route-level issues. For runtime trace work, go straight to chrome-devtools-mcp.

### Turbopack Tracing (Next.js 16 Default)

```bash
NEXT_TURBOPACK_TRACING=1 next dev
next internal turbo-trace-server
```

This is the only way to attribute module-resolution and compilation cost in dev. Useful when "dev server is slow on file change"; rarely needed for production perf.

### `next build` Output

The stdout table is authoritative for per-route First Load JS. Parse it instead of relying on bundle analyzer totals — the numbers are compressed + include everything the route actually ships.

Example row interpretation:
```
/products                                 5.2 kB          142 kB
  |-- route-specific JS ----------------- ^               ^
  |-- First Load JS (shared + route) --------------------/
```

## RSC Payload Debugging

Server Components payload uses content-type `text/x-component`. Two ways to inspect:

Direct curl:
```bash
curl -H "RSC: 1" http://localhost:3000/path
```

Query-param trigger (useful in browser Network tab):
```
http://localhost:3000/path?_rsc=1
```

When the LCP element seems to appear "late," correlate chunk arrival in `list_network_requests` (filter by content-type) to LCP paint timestamp. The LCP element often lives in a chunk that arrives after the initial HTML.

## `instrumentation.ts` (Stable in Next 15)

No longer behind `experimental.instrumentationHook`. Use `@vercel/otel` for edge-compatible OpenTelemetry:

```ts
// instrumentation.ts
import { registerOTel } from "@vercel/otel";
export function register() {
  registerOTel({ serviceName: "my-app" });
}
```

Add `NEXT_OTEL_VERBOSE=1` for extra spans when debugging.

## Cache Components (Next 16)

New rendering primitive that replaces `"use cache"`/`unstable_cache` for fine-grained component caching. Pay attention:

- Caching a Server Component means its HTML and RSC payload are cached together. LCP improvements here can be large but trade off with freshness.
- Invalidation happens via tags; `revalidateTag()` from a Server Action.
- If a Cache Component contains a Client Component, the client bundle is NOT re-cached — it's served from the normal static asset cache.

When investigating a "why is this page slow after deploy" regression in Next 16, check whether a Cache Component was invalidated and hasn't been re-warmed.

## Next.js-Specific Perf Bugs

| Bug | Signal | Fix |
|-----|--------|-----|
| `<Image>` without `priority` on LCP image | `LCPDiscovery` flags late resource discovery | Add `priority` to the above-the-fold image |
| Dynamic imports without `ssr: false` on client-only lib | Hydration error + slow first paint | `ssr: false` in `next/dynamic` options |
| `use client` boundary too high in the tree | Entire subtree ships as client JS; bundle bloat | Move `'use client'` down to the smallest subtree that actually needs interactivity |
| Server Action firing a chain of awaits | INP processing phase dominated by network | Parallelize with `Promise.all`, or split the action |
| Route handler doing synchronous DB calls | `DocumentLatency` high | Parallelize; add caching; check for N+1 |
| Middleware doing per-request work | TTFB inflated on every route | Move to layout or page; middleware runs on every request including RSC and static |
| `fetch()` inside a Server Component not using Next's cache | Repeated origin hits | Default cache behavior differs between Next 14/15/16 — check version; use `cache: 'force-cache'` or Next 16 Cache Components explicitly |

## Build-Time vs Runtime

When the user says "Next.js is slow", clarify:

- **Dev server slow** → Turbopack tracing; `next-devtools-mcp` compile errors
- **Build slow** → `next build --profile`; often a bundler plugin or large monorepo graph
- **Prod page slow** → chrome-devtools-mcp + the relevant scenario reference
- **Prod page slow *after deploy*** → cache invalidation (Cache Components, CDN edge cache); check `x-vercel-cache` header

## Route-Level vs App-Level

A perf issue on `/products` but not `/about` is route-level — start with the route's specific imports and layout nesting. A perf issue on every route points to root layout, middleware, global CSS, or a global provider. Don't conflate them.
