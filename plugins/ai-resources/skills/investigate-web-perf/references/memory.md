# Scenario: memory leak

Load when a tab slows down over time, heap usage grows monotonically across repeated actions, or detached DOM nodes and listeners accumulate.

## Common React leak shapes

| Shape | Snapshot signal | Typical cause |
| --- | --- | --- |
| Detached DOM retained | `HTMLDivElement` (or similar) retained size grows across snapshots | Closure captures a DOM ref or unmounted child via callback |
| Listener leak | `addEventListener` count grows on `window`/`document` | Missing or mismatched `removeEventListener` in `useEffect` cleanup |
| Timer leak | `setInterval` callbacks stay retained | `setInterval` / `setTimeout` never cleared on unmount |
| Observer leak | `MutationObserver` / `ResizeObserver` / `IntersectionObserver` count grows | Missing `.disconnect()` in effect cleanup |
| Subscription leak | Store or emitter subscriber counts grow | `.subscribe()` without returning its unsubscribe function |
| Closure over state | Arrow functions retain large state blobs | Stale `useCallback` or long-lived listener closing over large state |
| Route component retained | Unmounted component instances stay in heap | Module-scope `Set`/`Map` adds instances without removing on unmount |

## Investigation workflow (simplest tool first)

### 1. Three-snapshot heap comparison via `chrome-devtools-mcp`

Use `take_memory_snapshot` (wrapping `HeapProfiler.takeHeapSnapshot`) and save all snapshots to disk rather than streaming them into context:

1. Open the URL in a fresh tab and capture `snap1` (baseline after load).
2. Run the suspect action loop (for example 50 cycles of open+close modal, fill+submit+reset, or route A -> B -> A), idle 5 seconds, and capture `snap2`.
3. Idle another 5 seconds so GC settles, and capture `snap3`.
4. Diff retained size from `snap1` -> `snap2` -> `snap3`. Constructors growing monotonically past GC are leak suspects.

### 2. Automated SPA sweep with `fuite`

Run `npx fuite http://localhost:3000 --scenario ./leak-scenario.js` to automate repeated cycles and flag leaking objects, listeners, detached DOM, and growing collections with minimal setup.

### 3. Retainer-path attribution with `memlab`

When you need exact retainer chains to pin a leak to `file:line`, write a short `scenario.js` (`url`, `action`, `back`) and run:

```bash
memlab run --scenario ./scenario.js
memlab analyze unbound-object   # or: unbound-shape, detached-dom
```

## Cleanup grep patterns

Once a suspect constructor surfaces, scan matching source files for missing `useEffect` return cleanups:

```text
addEventListener
setInterval\(|setTimeout\(
new (Mutation|Resize|Intersection)Observer
\.subscribe\(
```

## Validation report

Include before/after three-snapshot comparisons showing monotonic growth stopped for the target constructor, the exact `file:line` cleanup added, and confirmation that LCP/INP did not regress.
