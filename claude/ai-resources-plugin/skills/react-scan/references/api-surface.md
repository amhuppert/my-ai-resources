# API Surface — Globals, Types, and Event Shapes

What react-scan exposes on the page, what it emits, and how to read each surface.

## Globals on `window`

| Global | Set by | Contents |
|---|---|---|
| `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` | bippy (installed when react-scan loads) | React's DevTools hook. Multiple consumers (React DevTools + react-scan) can coexist. |
| `window.__REACT_SCAN__` | Full bundle `scan()` call | `{ ReactScanInternals, version, ... }`. Primary handle for full-bundle integrations. |
| `window.__REACT_SCAN_VERSION__` | Full bundle | Version string. Compare across pages when debugging mismatches. |
| `window.__REACT_SCAN_LITE__` | `react-scan/lite` `instrument()` | The singleton `LiteHandle`. Subsequent `instrument()` calls return this same handle. |
| `window.__REACT_SCAN_TOOLBAR_CONTAINER__` | Overlay UI | The shadow-root container element. Useful only for overlay debugging. |
| `document.getElementById('react-scan-root')` | Overlay UI | Shadow host element. `shadowRoot` is non-null when the toolbar mounted. |

## `ReactScanInternals`

```ts
interface ReactScanInternals {
  options: Signal<Options>;
  instrumentation: {
    isPaused: Signal<boolean>;
    // other internal fields
  };
  Store: StoreType;
  onRender: (fiber, renders) => void;
  version: string;
  componentAllowList: WeakSet<unknown> | null;
  runInAllEnvironments: boolean;
}
```

Mutate options via either the imperative API:

```ts
setOptions({ showToolbar: false });
```

Or directly (preserves reactivity):

```ts
internals.options.value = { ...internals.options.value, showToolbar: false };
```

## `Options`

```ts
interface Options {
  enabled?: boolean;                          // default true
  dangerouslyForceRunInProduction?: boolean;  // default false; required for prod builds
  log?: boolean;                              // default false; console-logs every commit (verbose)
  showToolbar?: boolean;                      // default true
  animationSpeed?: "slow" | "fast" | "off";
  trackUnnecessaryRenders?: boolean;          // default false; expensive — flags renders that produced no DOM mutation
  showFPS?: boolean;
  showNotificationCount?: boolean;
  allowInIframe?: boolean;                    // required for iframe contexts
  safeArea?: number | { top?, right?, bottom?, left? };
  useOffscreenCanvasWorker?: boolean;         // default true
  onCommitStart?: () => void;
  onRender?: (fiber: Fiber, renders: Render[]) => void;
  onCommitFinish?: () => void;
}
```

`trackUnnecessaryRenders` is **off by default** because the analysis requires `didFiberCommit` and `getMutatedHostFibers` checks on every commit. Enable only for the targeted measurement window.

## `onRender(fiber, renders)` Callback

Fires once per commit per matched fiber, with the array of individual renders aggregated within that commit (multiple renders within a 16 ms debounce window collapse into one call).

```ts
type OnRender = (fiber: Fiber, renders: Render[]) => void;

interface Render {
  phase: "mount" | "update" | "unmount";
  componentName: string | null;
  time: number;       // self time in ms (post-debounce)
  count: number;      // number of renders aggregated into this entry
  changes: Change[];
  unnecessary?: boolean; // present only when trackUnnecessaryRenders is on
  // ...
}

interface Change {
  type: "props" | "state" | "context";
  name: string;       // e.g. "onClick", "value", "hook[2]", "ThemeContext"
  prevValue: unknown;
  nextValue: unknown;
  unstable: boolean;  // true if reference changed but values are structurally equal
}
```

`unstable: true` is the **single most actionable signal** — it means the parent passed a new reference (e.g., inline `{foo: 1}` or `() => {}`) for a logically unchanged value. 90% of unnecessary-render bugs have at least one `unstable: true` change.

## `Store.reportData`

```ts
Store.reportData: Map<number /* fiberId */, RenderData>;

interface RenderData {
  count: number;          // total renders since instrumentation start
  time: number;           // total time accumulated across renders
  renderCount?: number;   // some versions
  selfTime?: number;
  totalTime?: number;
  displayName?: string;
}
```

Use this to summarize "which components have rendered the most" without subscribing to every event. Iterate the map and aggregate by display name.

## `Store.changesListeners`

Subscribe per-fiber to receive only that fiber's changes — useful when investigating a specific component without paying for the whole tree.

```ts
const fiberId = /* obtain from inspector or by traversal */ 42;
const listeners = Store.changesListeners.get(fiberId) ?? [];
listeners.push((changes) => {
  // changes: ChangeDescription
});
Store.changesListeners.set(fiberId, listeners);
```

## `react-scan/lite` Event Taxonomy

The `LiteEvent.kind` discriminant determines which fields are populated.

| Kind | Fires when | Key fields |
|---|---|---|
| `renderer-injected` | Each React renderer registers | `rendererId`, `reactVersion`, `bundleType` |
| `profiling-hooks-status` | After attempting to attach profiling hooks | `available`, `reason`, `error` |
| `commit` | Every React commit | `tree`, `lanes`, `laneLabels`, `priorityLevel`, `priorityName`, `didError` |
| `post-commit` | After commit effects | `lanes` |
| `fiber-unmount` | Fiber unmount | `componentName` |
| `commit-start` / `commit-stop` | Per-commit boundaries | `lanes` |
| `render-start` / `render-stop` / `render-yield` | Per-commit render phase | `lanes` |
| `render-scheduled` | A state/force update was scheduled | `componentName`, `lanes` |
| `layout-effects-start` / `-stop` | Layout effect phase | `lanes` |
| `passive-effects-start` / `-stop` | Passive effect phase | `lanes` |
| `component-render-start` / `-stop` | Per-component render boundary | `componentName` |
| `component-{layout,passive}-effect-{mount,unmount}-{start,stop}` | Per-component effect boundary | `componentName` |
| `state-update` / `force-update` | Update scheduled on a fiber | `componentName`, `lanes` |
| `component-suspended` | Suspense triggered | `componentName`, `lanes` |
| `component-errored` | Error boundary caught an error | `componentName` |

The `component-render-start` events are the right grain for per-component render counting. The `commit` events with `tree` populated are the right grain for tree-snapshot analysis.

## `LiteFiberSummary` (the `commit.tree` entries)

```ts
interface LiteFiberSummary {
  name: string;
  depth: number;
  tag: number;                       // WorkTag from bippy (FunctionComponent, ClassComponent, etc.)
  actualDuration: number;            // ms
  actualStartTime: number;
  selfBaseDuration: number;
  treeBaseDuration: number;
  fiberId?: number;                  // present with includeFiberIdentity
  source?: FiberSource | null;       // { fileName, lineNumber, columnNumber } if includeFiberSource
  ownerName?: string | null;         // parent JSX component name
  changeDescription?: ChangeDescription | null; // if recordChangeDescriptions
}

interface ChangeDescription {
  isFirstMount: boolean;
  props: string[] | null;  // names of props whose REFERENCE changed (not value)
  state: boolean;          // class-component state changed
  context: boolean;        // any consumed context changed
  hooks: number[];         // indices into the hook linked list whose memoizedState changed
  parent: boolean;         // parent also rendered (cascade)
}
```

Key reading rules:

- `props` is a list of **prop names that changed by reference**. To know whether the value is also structurally different requires comparing `prevValue` / `nextValue` — lite mode does not include these (use full bundle `onRender` if you need them).
- `parent: true` means the render was triggered by a parent re-render, not by a self-scheduled update. This is the single most useful signal for cascade-render diagnosis.
- `hooks` indices map to position in the hook linked list as React stores them. Without source-map resolution they are not directly useful for fixes; combine with the `source` field to find the component file, then count hooks top-to-bottom in the source.
- `isFirstMount: true` excludes the render from "unnecessary" analysis — it's the mount.

## `LiteOptions`

```ts
interface LiteOptions {
  onEvent?: (event: LiteEvent) => void;
  endpoint?: string;        // POST events to URL; requires sessionId
  sessionId?: string;
  includeFiberTree?: boolean;             // default true
  includeProfilingHooks?: boolean;        // default true (no-op in prod builds)
  recordChangeDescriptions?: boolean;     // default false; enable for diagnosis
  includeFiberSource?: boolean;           // default false; enable to get file:line
  includeFiberIdentity?: boolean;         // default false; enable for cross-commit correlation
  includeLaneLabels?: boolean;            // default true
  location?: string;                      // POST `location` field prefix, default "ReactScanLite"
  maxFibersPerCommit?: number;            // default 5000
  minFiberActualDurationMs?: number;      // default 0; skip below-threshold subtrees
}
```

For diagnosis workflows, enable:

```ts
instrument({
  recordChangeDescriptions: true,
  includeFiberSource: true,
  includeFiberIdentity: true,
});
```

For pure render-count budget assertions, defaults are sufficient.

## `LiteHandle`

```ts
interface LiteHandle {
  stop(): void;                  // idempotent; restores all hook patches
  isActive(): boolean;
  subscribe(listener: (event: LiteEvent) => void): () => void; // returns unsubscribe
}
```

Use `subscribe()` for in-process listeners; multiple subscribers can coexist. The `stop()` call **does not** remove subscribers — call the returned unsubscribe.

## What `react-scan` Does NOT Expose

- **Source maps**. The `source` field reads `_debugSource` (React 16/17/18) or parses `_debugStack` (React 19+). It contains compiled file/line, not the original. If your build maps `.tsx` → `.js`, the line number is the `.js` line. To map back, run source-map resolution yourself (e.g., the `source-map` npm package) against the build's `.map` files.
- **Hook names**. `ChangeDescription.hooks` contains indices, not names. React 19's `useDebugValue` does not surface to bippy.
- **Network or paint data**. Out of scope — combine with chrome-devtools-mcp or web-vitals.

## Coexistence with React DevTools

Both react-scan and React DevTools register on `__REACT_DEVTOOLS_GLOBAL_HOOK__`. They coexist correctly. If the real DevTools is present, lite mode logs a console warning because some profiling hooks may be claimed by DevTools first — measurement is still possible, but `profiling-hooks-status` may report `available: false` for some renderers.

For Playwright tests, do **not** install the DevTools extension into the test browser profile. Use a clean Chromium and let react-scan own the hook.
