/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import path from 'path'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// api.ts falls back to http://localhost:8000 when VITE_API_BASE_URL is unset,
// which is right for `vite dev` and wrong for anything deployed: a production
// bundle built without it calls the visitor's own machine and fails silently.
// So a production build without the variable stops here instead.
function requireApiBaseUrl(): Plugin {
  return {
    name: 'require-api-base-url',
    apply: 'build',
    configResolved(config) {
      if (config.mode === 'production' && !config.env.VITE_API_BASE_URL) {
        throw new Error(
          'VITE_API_BASE_URL is not set. A production build needs the backend URL; ' +
          'set it in the deploy environment (or .env for a local build).',
        )
      }
    },
  }
}

export default defineConfig({
  plugins: [
    requireApiBaseUrl(),
    react(),
    VitePWA({
      // Auto-update the service worker on new deploys (no manual reload prompt
      // needed). Scope is "installable + fast app-shell loads" — we precache the
      // built static assets only and let all /api traffic hit the network, so no
      // user-specific data is ever cached.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Prodculator — Film Production Intelligence',
        short_name: 'Prodculator',
        description:
          'Upload your script and receive investor-ready production intelligence: location strategy, tax incentives, crew costs, and comparables.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA navigations fall back to the precached shell (fast/offline shell).
        navigateFallback: '/index.html',
        // Never let the shell intercept API or admin-data requests.
        navigateFallbackDenylist: [/^\/api/],
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
      },
      // Keep the SW out of `vite dev` to avoid stale-cache confusion while coding.
      devOptions: { enabled: false },
    }),
  ],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['@emotion/react', '@emotion/styled'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
