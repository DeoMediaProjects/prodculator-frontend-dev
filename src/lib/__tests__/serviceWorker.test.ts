import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initServiceWorker } from '../serviceWorker';

/**
 * The update path, driven through a fake registration.
 *
 * A real browser is the only place the whole lifecycle runs, but the decisions
 * this module makes — whether to reload, and whether an update attempt failed —
 * are page-side logic and testable without one. They are also the decisions
 * that were wrong: a reload on every first visit, and no recovery at all from
 * an install that never completes.
 */

type Listener = (event?: unknown) => void;

class FakeWorker {
  state: ServiceWorker['state'] = 'installing';
  private listeners: Listener[] = [];

  addEventListener(_type: 'statechange', fn: Listener) {
    this.listeners.push(fn);
  }

  /** Drive the worker through a state, notifying as the browser would. */
  transition(state: ServiceWorker['state']) {
    this.state = state;
    this.listeners.forEach((fn) => fn());
  }
}

class FakeRegistration {
  installing: FakeWorker | null = null;
  update = vi.fn(() => Promise.resolve());
  unregister = vi.fn(() => Promise.resolve(true));
  private listeners: Record<string, Listener[]> = {};

  addEventListener(type: string, fn: Listener) {
    (this.listeners[type] ??= []).push(fn);
  }

  /** An update attempt begins: a worker appears and starts installing. */
  beginUpdate(): FakeWorker {
    this.installing = new FakeWorker();
    (this.listeners.updatefound ?? []).forEach((fn) => fn());
    return this.installing;
  }
}

let registration: FakeRegistration;
let controllerChange: Listener | undefined;
let reload: ReturnType<typeof vi.fn>;
let cacheDelete: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // Vitest runs with DEV true, which takes the branch that unregisters
  // everything for `vite dev`. Everything below is about the production path.
  vi.stubEnv('DEV', false);
  vi.stubEnv('PROD', true);

  registration = new FakeRegistration();
  controllerChange = undefined;
  reload = vi.fn();
  cacheDelete = vi.fn(() => Promise.resolve(true));

  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      controller: null as unknown,
      ready: Promise.resolve(registration),
      getRegistration: () => Promise.resolve(registration),
      getRegistrations: () => Promise.resolve([registration]),
      addEventListener: (type: string, fn: Listener) => {
        if (type === 'controllerchange') controllerChange = fn;
      },
    },
  });

  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: { keys: () => Promise.resolve(['precache-v1']), delete: cacheDelete },
  });

  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });

  sessionStorage.clear();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

/** Let the `ready` promise chain settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('update checks', () => {
  it('checks for an update on boot', async () => {
    // Neither the hourly interval nor visibilitychange fires for a tab that is
    // opened and never hidden, so without this a deploy could sit unseen in
    // front of someone actively using the app for an hour.
    initServiceWorker();
    await settle();
    expect(registration.update).toHaveBeenCalled();
  });
});

describe('reloading when a new worker takes over', () => {
  it('reloads a page whose assets have been superseded', async () => {
    (navigator.serviceWorker as unknown as { controller: unknown }).controller = {};
    initServiceWorker();
    await settle();

    controllerChange?.();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does not reload a first visit', async () => {
    // clientsClaim makes a new registration claim the page that registered it,
    // firing controllerchange on a first visit. That page already fetched the
    // newest assets from the network, so reloading it is a wasted round trip.
    (navigator.serviceWorker as unknown as { controller: unknown }).controller = null;
    initServiceWorker();
    await settle();

    controllerChange?.();
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads at most once', async () => {
    (navigator.serviceWorker as unknown as { controller: unknown }).controller = {};
    initServiceWorker();
    await settle();

    controllerChange?.();
    controllerChange?.();
    controllerChange?.();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe('recovering from an install that fails', () => {
  it('clears the worker and its caches, then reloads', async () => {
    // The state that forces a user into devtools: the new worker never
    // activates, so the old one serves the old build forever and no
    // controllerchange ever fires. The deployed files are correct the whole
    // time, which is what makes it invisible from the outside.
    initServiceWorker();
    await settle();

    const worker = registration.beginUpdate();
    worker.transition('redundant');
    await settle();

    expect(registration.unregister).toHaveBeenCalled();
    expect(cacheDelete).toHaveBeenCalledWith('precache-v1');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('leaves an ordinary update alone', async () => {
    // A worker that installs and activates goes redundant later, when a newer
    // one supersedes it. That is the normal end of a worker's life, not a
    // failure, and clearing site data over it would be a reload loop on every
    // successful deploy.
    initServiceWorker();
    await settle();

    const worker = registration.beginUpdate();
    worker.transition('installed');
    worker.transition('activated');
    worker.transition('redundant');
    await settle();

    expect(registration.unregister).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('recovers only once per session', async () => {
    // A worker that can never install must not become a reload loop.
    initServiceWorker();
    await settle();

    registration.beginUpdate().transition('redundant');
    await settle();
    registration.beginUpdate().transition('redundant');
    await settle();

    expect(reload).toHaveBeenCalledTimes(1);
  });
});
