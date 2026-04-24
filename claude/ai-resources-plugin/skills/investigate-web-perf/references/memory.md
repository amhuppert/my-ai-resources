# Scenario: Memory Leak

Heap growth investigation. Load this reference when the symptom is a tab that slows over time, heap that grows monotonically across repeated scenarios, detached DOM accumulation, or event listeners that never release.

## Leak Shapes (Most Common in React Apps)

| Shape | Signal | Typical source |
|-------|--------|----------------|
| **Detached DOM retained** | Constructor `HTMLDivElement` (or similar) retained size grows across snapshots | A parent captured a DOM ref in closure; unmounted child held via callback |
| **Listener leak** | `addEventListener` count grows; browser reports listeners on `window`/`document` | `useEffect` added listener, return cleanup missing or misspelled |
| **Timer leak** | `setInterval` callbacks retained; functions hot in sampling profile | `setInterval`/`setTimeout` started but never cleared |
| **Observer leak** | `MutationObserver`/`ResizeObserver`/`IntersectionObserver` constructors grow | Observer `.disconnect()` missing from effect cleanup |
| **Subscription leak** | Store subscription counts grow; selector callbacks retained | `store.subscribe()` / event emitter without matching unsubscribe |
| **Closure-over-state** | Arrow functions retaining large state blobs | `useCallback` deps missing, closure captures stale but large value |
| **Route component retained** | Component instance retained after unmount | A module-scope `Set`/`Map` added `this` without removal |

## Tools (In Order of Complexity)

### 1. Heap snapshots via CDP (built into chrome-devtools-mcp)

The simplest workflow. `take_memory_snapshot` wraps `HeapProfiler.takeHeapSnapshot`. Capture three:

1. `snap1` — baseline after app loaded, scenario *not yet run*
2. `snap2` — after running the suspect scenario N times (fill+submit loop, open+close modal, navigate route A→B→A, etc.)
3. `snap3` — after another idle pause to let GC run

Compare `snap2` → `snap3` retained size. Constructors with monotonic growth after GC are suspects. Save snapshots as files; do not stream them into the model.

### 2. `fuite` (Recommended for SPAs)

Automates the N-scenario loop and reports leaking objects, listeners, detached DOM, and growing collections. Zero setup:

```bash
npx fuite http://localhost:3000 --scenario ./leak-scenario.js
```

Good first-pass tool before writing a custom memlab scenario.

### 3. `memlab` (Gold Standard for Precise Attribution)

Facebook's `memlab` (CLI + `@memlab/api` Node API + `@memlab/mcp-server` with 23 heap-analysis tools) is the right tool when you need attribution to specific retainer paths.

Scenario file:

```ts
// scenario.js
module.exports = {
  url: () => "http://localhost:3000",
  action: async (page) => {
    await page.click("[data-testid=open-modal]");
    await page.click("[data-testid=close-modal]");
  },
  back: async (page) => {
    // return to baseline state
  },
};
```

Run:

```bash
memlab run --scenario ./scenario.js
memlab analyze unbound-object   # or: unbound-shape, detached-dom
```

`memlab` identifies the retainer path, which is usually enough to pin the bug to file:line.

## Canonical Prompt

> Open `<URL>` in a fresh tab. Take a baseline heap snapshot saved as `snap1`. Run this scenario 50 times (describe the loop, e.g., fill+Enter+reset): `<scenario description>`. Idle for 5 seconds. Take `snap2`. Idle another 5 seconds and take `snap3`. Compare retained size growth across the three snapshots. Identify constructor names with monotonically growing retained size from snap1 → snap2 → snap3. For each suspect constructor, grep the codebase for `addEventListener`, `subscribe`, `setInterval`, `setTimeout`, `new MutationObserver`, `new ResizeObserver`, or `new IntersectionObserver` in files that could create that object type, and check for matching cleanup in `useEffect` return values. Produce a leak-suspect report with file:line anchors and classify each (listener leak / timer leak / observer leak / detached DOM / closure-over-state / subscription leak). **Do not fix anything** — return the report and wait for direction.

## Grep Patterns Worth Running

When a suspect surfaces, check for missing cleanup:

```
addEventListener                     # must have matching removeEventListener in cleanup
setInterval\(|setTimeout\(           # must have clearInterval/clearTimeout
new (Mutation|Resize|Intersection)Observer  # must have .disconnect()
\.subscribe\(                        # must have unsubscribe() return
```

A `useEffect` that starts one of these without returning a cleanup function is almost always the bug.

## Validation Template

- Before/after three-snapshot comparison showing no monotonic growth for the targeted constructor
- The specific cleanup added (file:line)
- Confirmation that the previously-reported constructor no longer appears in the growth diff
- No degradation in LCP/INP from the fix (unusual, but possible if cleanup does heavy work)
