/**
 * Playwright `addInitScript` helper that injects react-scan into a page that
 * does not already include it, then disables the toolbar for headless
 * measurement.
 *
 * Usage:
 *
 *   import { readFileSync } from 'node:fs';
 *   import { resolve } from 'node:path';
 *
 *   // Pin a copy of auto.global.js on disk so CI does not depend on unpkg.
 *   // Refresh manually with:
 *   //   curl -o fixtures/react-scan-auto.global.js https://unpkg.com/react-scan/dist/auto.global.js
 *   const reactScanBundle = readFileSync(
 *     resolve(__dirname, '../fixtures/react-scan-auto.global.js'),
 *     'utf8',
 *   );
 *   const inject = readFileSync(
 *     resolve(__dirname, 'inject-react-scan.js'),
 *     'utf8',
 *   );
 *
 *   await page.addInitScript(`
 *     ${reactScanBundle}
 *     ${inject}
 *   `);
 *
 *   await page.goto('/');
 *   // Counters are installed only after a React renderer registers via the
 *   // DevTools hook (which happens AFTER addInitScript runs). Await readiness
 *   // before reading any of the __REACT_SCAN_* globals.
 *   const ready = await page.evaluate(() => window.__REACT_SCAN_READY__);
 *   if (!ready) throw new Error('react-scan did not attach within 30s');
 *
 *   await page.evaluate(() => window.__REACT_SCAN_RESET__());
 *   // ... drive interactions ...
 *   const snapshot = await page.evaluate(() => window.__REACT_SCAN_SNAPSHOT__());
 *
 * Why the wait: `auto.global.js` registers `window.__REACT_SCAN__` only after
 * a React renderer announces itself on `__REACT_DEVTOOLS_GLOBAL_HOOK__`. That
 * happens once the page's own bundle loads React — which is AFTER the
 * addInitScript IIFE completes. A naive `if (window.__REACT_SCAN__) { ... }`
 * inside the same addInitScript will bail silently. This helper polls every
 * 50 ms (up to 30 s) and resolves `__REACT_SCAN_READY__` once counters are in.
 *
 * Configure via window.__REACT_SCAN_INJECT_OPTIONS__ — set it any time before
 * __REACT_SCAN__ appears (typically via a separate addInitScript earlier in
 * the chain). Defaults are headless-measurement friendly.
 */

(function configureReactScanForMeasurement() {
  if (typeof window === 'undefined') return;

  const POLL_INTERVAL_MS = 50;
  const TIMEOUT_MS = 30_000;

  function install() {
    const internals =
      window.__REACT_SCAN__ && window.__REACT_SCAN__.ReactScanInternals;
    if (!internals || !internals.options) return false;

    const userOptions = window.__REACT_SCAN_INJECT_OPTIONS__ || {};
    const prev = internals.options.value;
    const prevOnRender = prev.onRender;

    window.__REACT_SCAN_RENDER_COUNT__ = 0;
    window.__REACT_SCAN_COMPONENT_COUNTS__ = Object.create(null);

    internals.options.value = {
      ...prev,
      showToolbar: false,
      log: false,
      animationSpeed: 'off',
      showFPS: false,
      showNotificationCount: false,
      useOffscreenCanvasWorker: false,
      ...userOptions,
      onRender: (fiber, renders) => {
        window.__REACT_SCAN_RENDER_COUNT__ += renders.length;
        for (const render of renders) {
          const name = render.componentName || 'Anonymous';
          window.__REACT_SCAN_COMPONENT_COUNTS__[name] =
            (window.__REACT_SCAN_COMPONENT_COUNTS__[name] || 0) + 1;
        }
        if (prevOnRender) prevOnRender(fiber, renders);
      },
    };

    window.__REACT_SCAN_RESET__ = () => {
      window.__REACT_SCAN_RENDER_COUNT__ = 0;
      window.__REACT_SCAN_COMPONENT_COUNTS__ = Object.create(null);
    };

    window.__REACT_SCAN_SNAPSHOT__ = () => ({
      total: window.__REACT_SCAN_RENDER_COUNT__,
      components: { ...window.__REACT_SCAN_COMPONENT_COUNTS__ },
      timestamp: Date.now(),
    });

    return true;
  }

  window.__REACT_SCAN_READY__ = new Promise((resolve) => {
    if (install()) {
      resolve(true);
      return;
    }

    const start = Date.now();
    const interval = setInterval(() => {
      if (install()) {
        clearInterval(interval);
        resolve(true);
        return;
      }
      if (Date.now() - start > TIMEOUT_MS) {
        clearInterval(interval);
        try {
          console.warn(
            '[react-scan inject] __REACT_SCAN__ did not appear within ' +
              TIMEOUT_MS +
              ' ms; counters not installed. Did auto.global.js load? Is React present? Is this a production React build without dangerouslyForceRunInProduction?',
          );
        } catch {}
        resolve(false);
      }
    }, POLL_INTERVAL_MS);
  });
})();
