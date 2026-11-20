# `react-scan` API surface and event types

Globals, options, callbacks, and `react-scan/lite` event schemas exposed in the browser.

## Browser globals and attach timing

| Global | Set by | Notes |
| --- | --- | --- |
| `window.__REACT_DEVTOOLS_GLOBAL_HOOK__` | bippy (synchronous at script load) | Coexists with React DevTools |
| `window.__REACT_SCAN__` | Full bundle `scan()` (lazy) | `{ ReactScanInternals, version, ... }`. Set only after React injects a renderer |
| `window.__REACT_SCAN_VERSION__` | Full bundle (lazy) | Set alongside `__REACT_SCAN__`; may be undefined before React boots |
| `window.__REACT_SCAN_LITE__` | `react-scan/lite` `instrument()` | Singleton `LiteHandle` returned on repeat calls |
| `window.__REACT_SCAN_TOOLBAR_CONTAINER__` / `#react-scan-root` | Overlay UI | Shadow DOM container and host when toolbar is enabled |

Because `auto.global.js` installs the DevTools listener synchronously at load time and only assigns `window.__REACT_SCAN__` asynchronously when React boots, Playwright scripts must await `window.__REACT_SCAN_READY__` (via `scripts/inject-react-scan.js`) or `page.waitForFunction(() => window.__REACT_SCAN__?.ReactScanInternals)` after navigation.

## Full bundle internals and `Options`

```ts
interface ReactScanInternals {
  options: Signal<Options>;
  instrumentation: { isPaused: Signal<boolean> };
  Store: StoreType;
  onRender: (fiber: Fiber, renders: Render[]) => void;
  version: string;
  componentAllowList: WeakSet<unknown> | null;
  runInAllEnvironments: boolean;
}

interface Options {
  enabled?: boolean;                          // default true
  dangerouslyForceRunInProduction?: boolean;  // default false; required on prod React
  log?: boolean;                              // default false; verbose console output
  showToolbar?: boolean;                      // default true; set false in tests
  animationSpeed?: "slow" | "fast" | "off";
  trackUnnecessaryRenders?: boolean;          // default false; expensive (enable only in targeted windows)
  showFPS?: boolean;
  showNotificationCount?: boolean;
  allowInIframe?: boolean;
  safeArea?: number | { top?: number; right?: number; bottom?: number; left?: number };
  useOffscreenCanvasWorker?: boolean;         // default true
  onCommitStart?: () => void;
  onRender?: (fiber: Fiber, renders: Render[]) => void;
  onCommitFinish?: () => void;
}
```

Update options via `setOptions({ showToolbar: false })` or `internals.options.value = { ...internals.options.value, showToolbar: false }`.

## `onRender(fiber, renders)` and `Store`

Fires once per commit per matched fiber (multiple renders inside a 16 ms window aggregate into `renders`):

```ts
interface Render {
  phase: "mount" | "update" | "unmount";
  componentName: string | null;
  time: number;          // self time in ms
  count: number;         // renders merged into this entry
  changes: Change[];
  unnecessary?: boolean; // only when trackUnnecessaryRenders is true
}

interface Change {
  type: "props" | "state" | "context";
  name: string;          // e.g. "onClick", "value", "hook[2]", "ThemeContext"
  prevValue: unknown;
  nextValue: unknown;
  unstable: boolean;     // true when reference changed but structure is equal
}
```

`unstable: true` is the highest-signal field: the parent passed a new object, array, or closure for a logically identical value.

- `Store.reportData`: `Map<number, RenderData>` (`count` / `renderCount`, `time` / `selfTime` / `totalTime`, `displayName`) for summarizing hot components without listening to every event.
- `Store.changesListeners`: per-`fiberId` listener map when watching a single component without full-tree overhead.

## `react-scan/lite` events and options

| `LiteEvent.kind` | Fires when | Key fields |
| --- | --- | --- |
| `renderer-injected` | React renderer registers | `rendererId`, `reactVersion`, `bundleType` |
| `profiling-hooks-status` | After profiling hook attach | `available`, `reason`, `error` |
| `commit` | Every React commit | `tree`, `lanes`, `laneLabels`, `priorityLevel`, `priorityName`, `didError` |
| `post-commit`, `commit-start`, `commit-stop` | Commit lifecycle | `lanes` |
| `render-start`, `render-stop`, `render-yield` | Render phase boundaries | `lanes` |
| `render-scheduled`, `state-update`, `force-update` | Update scheduled | `componentName`, `lanes` |
| `component-render-start`, `component-render-stop` | Per-component render (best for counting) | `componentName` |
| `component-{layout,passive}-effect-{mount,unmount}-{start,stop}` | Effect lifecycle | `componentName` |
| `layout-effects-*`, `passive-effects-*` | Commit effect phases | `lanes` |
| `component-suspended`, `component-errored`, `fiber-unmount` | Suspense, error boundary, unmount | `componentName`, `lanes` |

### `LiteFiberSummary` and `ChangeDescription`

```ts
interface LiteFiberSummary {
  name: string;
  depth: number;
  tag: number;
  actualDuration: number;
  actualStartTime: number;
  selfBaseDuration: number;
  treeBaseDuration: number;
  fiberId?: number;                              // requires includeFiberIdentity
  source?: FiberSource | null;                   // requires includeFiberSource
  ownerName?: string | null;
  changeDescription?: ChangeDescription | null;  // requires recordChangeDescriptions
}

interface ChangeDescription {
  isFirstMount: boolean;
  props: string[] | null;  // prop names whose reference changed (no prev/next values in lite mode)
  state: boolean;
  context: boolean;
  hooks: number[];         // positional hook indices (count top-to-bottom in source)
  parent: boolean;         // true when triggered by parent re-render cascade
}
```

### `LiteOptions` and `LiteHandle`

For diagnosis, enable `recordChangeDescriptions: true`, `includeFiberSource: true`, and `includeFiberIdentity: true`. For pure CI render budgets, defaults suffice.

```ts
interface LiteOptions {
  onEvent?: (event: LiteEvent) => void;
  endpoint?: string;                      // POST URL; requires sessionId
  sessionId?: string;
  includeFiberTree?: boolean;             // default true
  includeProfilingHooks?: boolean;        // default true (no-op on prod React)
  recordChangeDescriptions?: boolean;     // default false
  includeFiberSource?: boolean;           // default false
  includeFiberIdentity?: boolean;         // default false
  includeLaneLabels?: boolean;            // default true
  location?: string;                      // default "ReactScanLite"
  maxFibersPerCommit?: number;            // default 5000
  minFiberActualDurationMs?: number;      // default 0
}

interface LiteHandle {
  stop(): void; // idempotent; does NOT auto-unsubscribe listeners
  isActive(): boolean;
  subscribe(listener: (event: LiteEvent) => void): () => void;
}
```

## Limits and DevTools coexistence

- **Compiled line numbers only:** `source` reads `_debugSource` (React 16 to 18) or `_debugStack` (React 19+) and reports compiled file/line. Resolve against `.map` files with `source-map` if needed.
- **No hook names or network/paint data:** `hooks` gives numeric indices only; combine with `chrome-devtools-mcp` for paint/layout/network visibility.
- **React DevTools coexistence:** both share `__REACT_DEVTOOLS_GLOBAL_HOOK__`, though DevTools may claim profiling hooks first (causing `profiling-hooks-status.available: false`). Keep React DevTools out of automated Playwright profiles.
