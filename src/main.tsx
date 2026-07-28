import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { initSentry } from '@/lib/sentry';
import { initServiceWorker } from '@/lib/serviceWorker';

import '@/styles/theme.css';
import '@/styles/fonts.css';

// Import global error handler to suppress known warnings
import '@/utils/errorHandler';

// Start error monitoring as early as possible (no-op without VITE_SENTRY_DSN).
initSentry();

// Clears a stale worker in dev, and reloads once on a new deploy in production.
initServiceWorker();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);