/**
 * Service worker lifecycle.
 *
 * The PWA plugin registers the worker itself in production builds
 * (injectRegister defaults to 'auto') and is disabled in `vite dev`. That
 * leaves the gaps this module closes.
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
 *    deploy lands without anyone being told to hard refresh. Update checks on
 *    boot, on an interval and on tab focus catch long-lived tabs.
 *
 * 3. PRODUCTION: an install that fails leaves the old worker serving the old
 *    build forever, silently. Nothing above recovers from that, because there
 *    is no new worker for any of it to notice. See `recover` below.
 */

const UPDATE_INTERVAL_MS = 60 * 60 * 1000; // hourly

/** Set once a self-heal has run, so a worker that cannot install ever is not a
 *  reload loop. Per tab session: a genuinely broken deploy that is later fixed
 *  should be recoverable without the user closing the tab. */
const RECOVERY_KEY = 'prodculator:sw-recovered';

function alreadyRecovered(): boolean {
  // Private windows and blocked site data both throw here. A failure to read
  // the flag must not stop the page loading, so it degrades to "not yet
  // recovered" and the guard below is the reload protection instead.
  try {
    return sessionStorage.getItem(RECOVERY_KEY) === '1';
  } catch {
    return false;
  }
}

function markRecovered(): void {
  try {
    sessionStorage.setItem(RECOVERY_KEY, '1');
  } catch {
    /* see alreadyRecovered */
  }
}

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

  // Whether a worker was already driving this page when it loaded.
  //
  // `clientsClaim` makes a brand-new registration take control of the very page
  // that registered it, which fires `controllerchange` on a first visit. That
  // page is already showing the newest assets — it just fetched them from the
  // network — so reloading it was a wasted round trip on every first load. Only
  // a change of controller on a page that already had one means the assets in
  // front of the user have been superseded.
  const hadController = Boolean(navigator.serviceWorker.controller);

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // Guard against a reload loop if control changes more than once.
    if (!hadController || reloading) return;
    reloading = true;
    window.location.reload();
  });

  /** Unregister everything and reload, the thing a user otherwise does by hand.
   *
   *  Only for an install that failed. A worker whose install throws — most
   *  often because one precached URL 404s, and this build precaches 164 of
   *  them — never activates, so the old worker keeps serving the old build
   *  indefinitely. No amount of calling `update()` helps: the update is found
   *  every time and fails every time, and none of the reload paths above ever
   *  fire because no new worker takes control.
   *
   *  That is the state in which the only remaining move is devtools, and it is
   *  invisible from the outside: the deployed files are correct, so the server
   *  looks right while the browser is stuck. */
  const recover = async (reason: string) => {
    if (alreadyRecovered()) {
      console.error(`[sw] ${reason}, and a recovery has already been attempted this session.`);
      return;
    }
    markRecovered();
    console.warn(`[sw] ${reason}. Clearing the worker and its caches, then reloading.`);
    await clearAll();
    window.location.reload();
  };

  /** Watch one update attempt through to activation, or to its failure. */
  const watchUpdate = (registration: ServiceWorkerRegistration) => {
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      let reachedInstalled = false;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' || installing.state === 'activated') {
          reachedInstalled = true;
          return;
        }
        // `redundant` is also how a worker ends when a newer one supersedes it,
        // which is ordinary. Only a worker that went redundant without ever
        // reaching `installed` failed to install.
        if (installing.state === 'redundant' && !reachedInstalled) {
          void recover('A new service worker failed to install');
        }
      });
    });
  };

  const checkForUpdate = () => {
    void navigator.serviceWorker.getRegistration().then((reg) => reg?.update());
  };

  // Once on boot, not only on the interval and on focus. A tab opened and never
  // hidden fired neither for a full hour, so a deploy could sit unseen in front
  // of someone actively using the app — which is how a shipped fix was reported
  // as not working while the built asset on the server plainly contained it.
  //
  // After the plugin's own registration, so this updates the worker it just
  // registered rather than racing it.
  void navigator.serviceWorker.ready.then((registration) => {
    watchUpdate(registration);
    void registration.update();
  });

  window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdate();
  });
}
