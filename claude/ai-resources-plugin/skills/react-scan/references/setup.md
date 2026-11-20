# Installing `react-scan` by framework

Choose the install path that matches how you are testing:

| Context | Install path | Why |
| --- | --- | --- |
| Standard React repo you own | `npx react-scan@latest init` | Detects framework, package manager, and entrypoint; previews diff |
| Managed Vite app | `@react-scan/vite-plugin-react-scan` | One plugin line; handles dev/build and `autoDisplayNames` |
| Headless Playwright / CI / agent capture | `react-scan/lite` or `addInitScript` injection | Zero toolbar/overlay overhead |
| Quick check on any local URL | `npx react-scan@latest <URL>` | Zero code changes; runs as a proxy |
| Deployed app you do not control | Chrome/Firefox browser extension | Per-origin toggle (not usable for Playwright or programmatic extraction) |

## CLI init (`react-scan init`)

Run `npx react-scan@latest init` from the project root. It detects Next.js (App or Pages Router), Vite, TanStack Start, Webpack/CRA, plus package manager from lockfile, shows a unified diff, and installs the package. Useful flags: `--yes` / `-y` (non-interactive), `--cwd <path>`, `--skip-install`. TanStack Start and `unknown` projects require manual setup below.

## Manual framework setup

Always load `react-scan` **before** React boots so it installs on `__REACT_DEVTOOLS_GLOBAL_HOOK__` prior to the first commit. Keep the `process.env.NODE_ENV === "development"` guard unless you intentionally debug a production build.

### Next.js App Router (`app/layout.tsx`)

```tsx
import Script from "next/script";

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-scan/dist/auto.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </head>
      <body>{children}</body>
    </html>
  );
}
```

For Next.js Pages Router, add the same `<Script>` inside `<Head>` in `pages/_document.tsx`. For Remix, put a plain `<script crossOrigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js" />` inside `<head>` in `app/root.tsx`.

### Vite (preferred plugin)

```bash
npm install -D @react-scan/vite-plugin-react-scan
```

```ts
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { reactScanPlugin } from "@react-scan/vite-plugin-react-scan";

export default defineConfig({
  plugins: [
    react(),
    reactScanPlugin({
      enable: process.env.NODE_ENV !== "production",
      autoDisplayNames: true, // injects displayName on anonymous JSX/TSX components
    }),
  ],
});
```

If using a raw `<script crossorigin="anonymous" src="//unpkg.com/react-scan/dist/auto.global.js"></script>` in `index.html` instead, place it in `<head>` before `/src/main.tsx`.

### Programmatic npm import

Import `react-scan` before React in the app entrypoint:

```ts
import { scan } from "react-scan";

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  scan({
    enabled: true,
    log: false,        // avoid console overhead while measuring
    showToolbar: true, // set false for Playwright/headless
    onRender: (fiber, renders) => {},
  });
}
```

### Headless lite mode (`react-scan/lite`)

Ships no overlay, Preact, or DOM. Singleton-safe: repeated calls return the existing handle at `window.__REACT_SCAN_LITE__`.

```ts
import { instrument } from "react-scan/lite";

const handle = instrument({
  onEvent: (event) => {},
  includeFiberTree: true,
  recordChangeDescriptions: true, // props / state / context / hooks / parent
  includeFiberSource: true,       // compiled file:line
  includeFiberIdentity: true,     // stable fiberId across commits
  includeProfilingHooks: true,    // component-render-start/stop events
  maxFibersPerCommit: 2000,
});

// Later:
handle.stop();
```

You can also pass `endpoint` + `sessionId` to POST events with `keepalive: true` (subject to the ~64 KB browser keepalive cap).

## Production builds and verification

`scan()` short-circuits on production React builds via bippy's `detectReactBuildType`. Against a preview/prod build you control, set `scan({ dangerouslyForceRunInProduction: true })` or counters will stay at zero.

Verify in the browser console after load:

```js
typeof window.__REACT_SCAN__              // "object" (full bundle)
window.__REACT_SCAN__.ReactScanInternals  // truthy once React renderer attaches
window.__REACT_SCAN_LITE__                // truthy in lite mode
```

If nothing attaches: check whether CSP blocks `unpkg.com` (self-host or use npm), React imported before `react-scan`, prod React without `dangerouslyForceRunInProduction`, or an iframe missing `allowInIframe: true`.
