# Framework: Next.js

Load alongside [`react.md`](react.md) and the scenario reference for Next.js projects (targeting Next.js 15 and 16+).

## Next.js diagnostic tools

### `next-devtools-mcp` (Next.js 16+)

Connects to `/_next/mcp` in dev mode for live compile/runtime errors, route trees, Suspense boundaries (and Next 16.2+ experimental Agent DevTools), and Cache Components migration checks. Call it before `chrome-devtools-mcp` for build-time or route-structure problems; go straight to `chrome-devtools-mcp` for runtime traces.

### Turbopack tracing (dev-server slowness)

```bash
NEXT_TURBOPACK_TRACING=1 next dev
next internal turbo-trace-server
```

Attributes module-resolution and compilation hotspots in dev. Rarely needed for production runtime perf.

### `next build` stdout

Treat `next build` stdout as authoritative for compressed per-route First Load JS (`route-specific JS` vs. `shared + route First Load JS`).

## Debugging RSC payloads

Server Component streams use `content-type: text/x-component`. Inspect them via:

```bash
curl -H "RSC: 1" http://localhost:3000/path
# or in the browser Network tab: http://localhost:3000/path?_rsc=1
```

When an LCP element paints late, filter `list_network_requests` by `text/x-component` and compare chunk arrival timestamps against LCP paint.

## OpenTelemetry (`instrumentation.ts`, stable in Next 15+)

No experimental flag needed. Use `@vercel/otel` inside `instrumentation.ts` (`registerOTel({ serviceName: "my-app" })`) and set `NEXT_OTEL_VERBOSE=1` when you need extra spans.

## Cache Components (Next.js 16)

Replaces `"use cache"` / `unstable_cache` for component-level caching:

- Caching a Server Component caches its HTML and RSC payload together (trading freshness for lower TTFB/LCP).
- Invalidate via tags (`revalidateTag()` from a Server Action).
- Client Component bundles inside a Cache Component still come from the normal static asset cache.
- For post-deploy regressions in Next 16, check whether a Cache Component was invalidated and left cold.

## Common Next.js perf bugs

| Bug | Signal | Fix |
| --- | --- | --- |
| `<Image>` missing `priority` on hero | `LCPDiscovery` flags late discovery | Add `priority` to the above-the-fold image |
| Dynamic import of client-only lib without `ssr: false` | Hydration mismatch + slow first paint | Pass `{ ssr: false }` to `next/dynamic` |
| `'use client'` placed too high in the tree | Large client JS bundle across subtrees | Push `'use client'` down to the smallest interactive leaf |
| Sequential `await` chain in a Server Action | Network latency inflates INP processing | Parallelize with `Promise.all` or split the action |
| Uncached/serial DB queries in Route Handler | High `DocumentLatency` | Parallelize, cache, check for N+1 queries |
| Heavy work in `middleware.ts` | Elevated TTFB on every route and RSC request | Move logic to a layout or page where possible |
| Uncached `fetch()` in Server Component | Repeated origin hits | Check Next 14/15/16 cache defaults; set `cache: "force-cache"` or Cache Components explicitly |

## Narrow the layer before digging in

- **Dev server slow:** Turbopack tracing and `next-devtools-mcp` compile errors.
- **Production build slow:** `next build --profile` (bundler plugins or monorepo graph).
- **One route slow (`/products`, not `/about`):** inspect that route's imports and nested layouts.
- **Every route slow:** inspect root layout, middleware, global CSS, or root providers.
- **Slow right after deploy:** check Cache Components invalidation, CDN edge cache, and `x-vercel-cache`.
