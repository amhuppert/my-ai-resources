# Setup — Installing react-scan per Framework

React-scan supports five install paths. Pick based on context, not preference.

## Install Path Decision

| Context | Install path | Why |
|---|---|---|
| Greenfield install in a React project the user owns | `npx react-scan@latest init` | CLI detects framework + package manager, shows diff, modifies entrypoint |
| Vite project the user maintains | `@react-scan/vite-plugin-react-scan` | Single-line plugin config; handles dev + build correctly |
| Audit a deployed app the user does not control | Browser extension | Zero code change; toggle on/off per origin |
| Quick check against any local URL | `npx react-scan@latest <URL>` | No install at all; runs as a proxy |
| Headless / programmatic / Playwright / CI | `react-scan/lite` or `react-scan/auto` via injection | No overlay overhead |

## `react-scan init` (CLI)

Run from the project root:

```bash
npx react-scan@latest init
```

The CLI detects:

- **Framework** — Next.js (App vs. Pages Router via `app/` vs. `pages/`), Vite, TanStack Start, Webpack/CRA, or `unknown`. Read from `package.json` dependencies.
- **Package manager** — `bun.lockb` → bun, `pnpm-lock.yaml` → pnpm, `yarn.lock` → yarn, else npm.
- **Entrypoint** — `app/layout.{tsx,jsx,js}`, `pages/_document.{tsx,jsx,js}`, `index.html`, `public/index.html`, `src/index.html`, `src/{index,main}.{tsx,ts,jsx,js}`.

Then prints a colored unified diff, prompts for confirmation, writes one file, and installs the package. Flags:

- `--yes` / `-y` — non-interactive (for postinstall hooks or CI bootstrap)
- `--cwd <path>` — operate on a directory other than `process.cwd()`
- `--skip-install` — skip the `npm install react-scan` step

**TanStack Start and `unknown` frameworks** are detected but not auto-transformed; the CLI directs the user to manual setup.

## Manual Setup per Framework

### Next.js App Router

`app/layout.tsx`:

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

The `process.env.NODE_ENV === "development"` guard matches what `react-scan init` writes. Do not remove it unless you intentionally want react-scan in production (rare; see `dangerouslyForceRunInProduction` below).

### Next.js Pages Router

`pages/_document.tsx`:

```tsx
import { Html, Head, Main, NextScript } from "next/document";
import Script from "next/script";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-scan/dist/auto.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
```

### Vite (script tag)

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <script
      crossorigin="anonymous"
      src="//unpkg.com/react-scan/dist/auto.global.js"
    ></script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`auto.global.js` is the IIFE bundle: it auto-calls `scan()` on load. Mount it **before** the application module so the DevTools hook is installed before React boots.

### Vite (plugin — preferred for managed projects)

Install:

```bash
npm install -D @react-scan/vite-plugin-react-scan
```

`vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { reactScanPlugin } from "@react-scan/vite-plugin-react-scan";

export default defineConfig({
  plugins: [
    react(),
    reactScanPlugin({
      // dev-only by default; set to true to ship in prod
      enable: process.env.NODE_ENV !== "production",
      // optional: Babel pass that injects displayName on every JSX/TSX
      // anonymous component so the overlay shows real names
      autoDisplayNames: true,
    }),
  ],
});
```

The plugin:
- Removes any pre-existing react-scan script tags during `transformIndexHtml` to prevent duplicates
- During `vite dev`, injects an ESM virtual module that calls `scan()` automatically
- During `vite build`, emits `auto.global.js` as a static asset and injects a `<script>` tag

`autoDisplayNames: true` runs a Babel pass over `.jsx` / `.tsx` files, adding `Component.displayName = "..."` assignments — without this, anonymous default-exported components show up as `Anonymous` in the overlay.

### Remix

`app/root.tsx`:

```tsx
import { Links, Meta, Outlet, Scripts } from "@remix-run/react";

export default function App() {
  return (
    <html>
      <head>
        <Meta />
        {process.env.NODE_ENV === "development" && (
          <script
            crossOrigin="anonymous"
            src="//unpkg.com/react-scan/dist/auto.global.js"
          />
        )}
        <Links />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
```

### Programmatic (npm package)

```ts
import { scan } from "react-scan"; // import BEFORE React

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  scan({
    enabled: true,
    log: false,        // do not enable console logging in measurement scenarios
    showToolbar: true, // false for headless / Playwright
    onRender: (fiber, renders) => {
      // optional callback — receives the same data the overlay uses
    },
  });
}
```

**Import order matters.** `scan()` registers the DevTools hook; React reads it on init. If React loads first, the first commit will not be observed (though subsequent commits will). The script-tag and Vite-plugin paths handle this for you; in npm-import mode, import `react-scan` from your entrypoint **before** the React app boots.

### Lite mode (`react-scan/lite`) — headless

```ts
import { instrument } from "react-scan/lite";

const handle = instrument({
  onEvent: (event) => {
    // event: LiteEvent { kind, timestamp, componentName?, tree?, ... }
  },
  includeFiberTree: true,
  recordChangeDescriptions: true, // attribute renders to props/state/context/hooks/parent
  includeFiberSource: true,       // file:line of where the JSX was authored
  includeFiberIdentity: true,     // stable fiberId across commits for correlation
  includeProfilingHooks: true,    // per-component render-start/stop events
  maxFibersPerCommit: 2000,       // tune for large trees
});

// Later:
handle.stop();
```

`react-scan/lite` does **not** ship the overlay, Preact, or any DOM. It is the right choice for:

- Playwright tests collecting render data
- CI scripts that diff render counts between branches
- Custom developer tooling that needs structured fiber events
- POST-to-endpoint pipelines: pass `endpoint` and `sessionId` and every event is `fetch`-POSTed with `keepalive: true`

The `instrument()` call is **singleton-safe**: repeated calls return the existing handle stored at `window.__REACT_SCAN_LITE__` rather than re-instrumenting.

### Browser Extension

Install from Chrome Web Store / Firefox Add-ons. Activation per origin via the toolbar button. State persists across reloads through `chrome.storage.local`.

The extension is the right tool when:
- The page is production-deployed and you cannot modify its source
- A user reports an issue you cannot reproduce locally
- Comparing render behavior across multiple sites

It is **wrong** for measurement-driven workflows because:
- It cannot programmatically extract render data
- It cannot be driven by Playwright
- The extension version may differ from the npm version under measurement

## Environment Guards & Production

By default, `scan()` short-circuits on production React builds via bippy's `detectReactBuildType`. To force-enable in production (rare — only for debugging a prod-only issue against a deployed build you control):

```ts
scan({ dangerouslyForceRunInProduction: true });
```

**In Playwright tests against a local dev server**, the dev build is fine — no flag needed. **In Playwright tests against a production build** (e.g., e2e against a preview deployment), set the flag or react-scan will be inactive and your render counts will be zero.

## Verification

After install, in the browser console:

```js
typeof window.__REACT_SCAN__              // "object" if loaded
window.__REACT_SCAN__.ReactScanInternals  // truthy if instrumentation booted
window.__REACT_SCAN_VERSION__              // version string
document.querySelectorAll('canvas').length // ≥1 if outline overlay mounted
document.getElementById('react-scan-root') // shadow host if toolbar enabled
```

In lite mode, check `window.__REACT_SCAN_LITE__` instead.

If none of these are present after the page loads, the script did not execute. Common causes:

- Strict CSP blocking `unpkg.com` — switch to the npm package or self-host `auto.global.js`
- React loaded before react-scan — fix import order
- Production build without `dangerouslyForceRunInProduction`
- iframe context blocked by default — pass `allowInIframe: true` to `scan()`
