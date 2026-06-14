import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry error monitoring. No-op unless VITE_SENTRY_DSN is set, so
 * local dev and any build without a DSN are unaffected. Call once at startup,
 * before rendering the app.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0),
    sendDefaultPii: false,
  });
}
