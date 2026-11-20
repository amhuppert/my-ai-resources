# Scenario: LCP regression

Load when first paint is slow, LCP exceeds 2.5s at p75 under Slow 4G + 4x CPU, or `LCPBreakdown` regresses.

## Four-subpart model

LCP is the sum of four subparts. Name the dominant subpart before proposing any fix; trimming 100 ms of render delay while TTFB is 1,800 ms wastes time.

| Subpart | What it measures | Typical fixes |
| --- | --- | --- |
| TTFB | Server response time | Caching, edge deploy, faster queries, removing redirects |
| Resource load delay | Time from TTFB until the LCP resource starts fetching | Preload, `fetchpriority="high"`, removing earlier render-blocking resources, moving out of lazy chunks |
| Resource load duration | Download time of the LCP asset | Compression, resizing, AVIF/WebP, CDN, reducing competing requests |
| Element render delay | Time from resource loaded until painted | Cutting blocking JS, hydration overhead, or Suspense fallbacks delaying paint |

## Insight sequence

Capture a cache-cold reload trace saved to `trace.json.gz`, then call these insights in order and stop once one subpart clearly dominates:

1. `LCPBreakdown`: returns the four-subpart split.
2. `LCPDiscovery`: shows how the browser discovered the LCP asset (catches `loading="lazy"` on hero images, late-discovered heroes, CSS `background-image` heroes).
3. `DocumentLatency`: checks TTFB causes (redirect chains, slow origins, uncompressed HTML).
4. `RenderBlocking`: identifies stylesheets and scripts blocking first paint.

Escalate to `NetworkDependencyTree` and `LongCriticalNetworkTree` only if steps 1 to 4 do not isolate the dominant subpart. Use `evaluate_script` solely to inspect the LCP element's tag, `src`, and timing if the insight does not already name it.

## Common gotchas

- **`loading="lazy"` on a hero image** is the most frequent LCP bug on content sites (`LCPDiscovery` flags it directly).
- **CSS `background-image` hero** cannot be discovered early by the preload scanner; switch to `<img fetchpriority="high">` or add a matching `<link rel="preload" as="image">`.
- **Text LCP blocked by fonts:** run `FontDisplay`; `font-display: swap` or `optional` usually resolves text-LCP stalls.
- **Streaming SSR / RSC:** the LCP element may arrive in a later RSC chunk (`text/x-component`). Correlate chunk arrival in `list_network_requests` against LCP paint rather than running `querySelector` at `DOMContentLoaded` (see [`nextjs.md`](nextjs.md)).
- **Priority hints:** adding `fetchpriority="high"` on the hero `<img>` or preload link is often a one-line win before larger refactors.

## Validation report

Include before/after `.json.gz` trace paths, `LCPBreakdown` subpart deltas (showing the dominant subpart shrank), confirmation that INP, CLS, and route bundle size did not regress, and the single-variable diff.
