import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { initSentry } from '@/lib/sentry';

import '@/styles/theme.css';
import '@/styles/fonts.css';

// Import global error handler to suppress known warnings
import '@/utils/errorHandler';

// Start error monitoring as early as possible (no-op without VITE_SENTRY_DSN).
initSentry();

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