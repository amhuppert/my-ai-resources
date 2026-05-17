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
 * Configure via window.__REACT_SCAN_INJECT_OPTIONS__ BEFORE addInitScript runs
 * (e.g., from a separate addInitScript call earlier in the chain). Defaults
 * are headless-measurement friendly.
 */

(function configureReactScanForMeasurement() {
  if (typeof window === 'undefined') return;
  if (!window.__REACT_SCAN__) {
    // auto.global.js did not load — likely a CSP block or the inject snippet
    // ran before the bundle. Bail silently; the test will fail loudly when
    // it tries to read globals.
    return;
  }

  const userOptions = window.__REACT_SCAN_INJECT_OPTIONS__ || {};
  const internals = window.__REACT_SCAN__.ReactScanInternals;
  const prev = internals.options.value;

  internals.options.value = {
    ...prev,
    showToolbar: false,
    log: false,
    animationSpeed: 'off',
    showFPS: false,
    showNotificationCount: false,
    useOffscreenCanvasWorker: false,
    ...userOptions,
  };

  // Render counter — increments every onRender callback invocation.
  window.__REACT_SCAN_RENDER_COUNT__ = 0;
  // Per-component render counts — keyed by displayName.
  window.__REACT_SCAN_COMPONENT_COUNTS__ = Object.create(null);

  const prevOnRender = prev.onRender;
  internals.options.value = {
    ...internals.options.value,
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

  // Reset helpers callable from Playwright tests via page.evaluate().
  window.__REACT_SCAN_RESET__ = () => {
    window.__REACT_SCAN_RENDER_COUNT__ = 0;
    window.__REACT_SCAN_COMPONENT_COUNTS__ = Object.create(null);
  };

  window.__REACT_SCAN_SNAPSHOT__ = () => ({
    total: window.__REACT_SCAN_RENDER_COUNT__,
    components: { ...window.__REACT_SCAN_COMPONENT_COUNTS__ },
    timestamp: Date.now(),
  });
})();
