/**
 * Service worker lifecycle.
 *
 * The PWA plugin registers the worker itself in production builds
 * (injectRegister defaults to 'auto') and is disabled in `vite dev`. That
 * leaves two gaps this module closes.
 *
 * 1. DEV: a worker registered once on this origin by a production build, or by
 *    serving `dist/` locally, stays registered for the origin indefinitely. It
 *    then keeps intercepting requests in `vite dev` and serving precached
 *    assets from that old build, which looks like edits having no effect and is
 *    why clearing site data by hand was the only way forward. Dev now clears
 *    any worker and its caches on boot, so the situation cannot persist.
 *
 * 2. PRODUCTION: `registerType: 'autoUpdate'` installs a new worker and claims
 *    clients, but the page the user is already looking at keeps its old assets
 *    until it navigates. Reloading once when a new worker takes control means a
 *    deploy lands without anyone being told to hard refresh. An update check on
 *    an interval and on tab focus catches long-lived tabs.
 */

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // hourly

async function clearAll(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((r) => r.unregister()));

  // Unregistering leaves the Cache Storage entries behind, and those are what
  // actually serve the stale files.
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }

  return registrations.length > 0;
}

export function initServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;

  if (import.meta.env.DEV) {
    void clearAll().then((hadWorker) => {
      if (!hadWorker) return;
      // Assets for this page were probably served by the worker we just removed,
      // so reload once to pick them up from the dev server instead.
      console.info('[sw] Removed a stale service worker from a previous build. Reloading.');
      window.location.reload();
    });
    return;
  }

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Guard against a reload loop if control changes more than once.
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  const checkForUpdate = () => {
    void navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
  };

  window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}
