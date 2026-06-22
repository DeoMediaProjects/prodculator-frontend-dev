# Mobile Adaptation & PWA Integration Plan

**Status:** Proposed
**Author:** Engineering
**Date:** 2026-06-22
**Scope:** Frontend-facing (public/user) UI only. Admin (`src/app/components/admin/*`) is out of scope unless explicitly noted.

---

## 1. Executive summary

Prodculator's frontend was built desktop-first. It renders well at ≥1024px but **distorts on phones/tablets** because:

- Primary navigation **disappears** on small screens with no replacement.
- Wide **data tables and calculator grids overflow** the viewport (fixed widths up to `1540px`).
- The **global theme typography is fixed-size** (h1 = `3.5rem`), so headings overflow.
- `100vh` is used in 27 files, causing content cut-off behind mobile browser chrome.

This plan delivers two outcomes:

1. **A consistent, mobile-first responsive system** — a shared app shell with a real mobile nav, responsive typography, reusable responsive primitives, and a component-by-component remediation pass.
2. **Progressive Web App (PWA) capability** — installable, offline-aware, with app icons, a web manifest, and a service worker.

The work is **incremental and non-breaking**: existing inline `sx` breakpoints stay; we add a foundation layer first, then migrate components by priority. No backend changes required.

---

## 2. Current state assessment

### 2.1 Stack

| Area | Detail |
|---|---|
| Framework | React 18.3, Vite 6, TypeScript |
| UI | MUI 7.3 + Emotion (`@emotion/react`, `@emotion/styled`) |
| Routing | react-router 7 (lazy routes, `Suspense`) |
| Animation | `motion` (Framer Motion) 12 |
| Other | notistack, firebase, sentry, react-helmet-async |
| Theme | Single global dark theme created in `src/app/App.tsx` |

### 2.2 What already works on mobile (keep / build on)

- `index.html` already has a correct `<meta name="viewport" content="width=device-width, initial-scale=1.0">`.
- `LandingPage` uses responsive font sizes and a footer that stacks (`flexDirection: { xs: 'column', md: 'row' }`).
- Dashboard & report **tab bars are already mobile-aware**: `variant="scrollable" scrollButtons="auto"` with icons hidden on `xs` (`src/app/components/user/UserDashboard.tsx:546`, `src/app/components/user/ReportViewer.tsx:526`).
- `B2BSolutions` has at least one responsive card grid (`gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }`).

### 2.3 Systemic problems

| # | Problem | Evidence | Impact |
|---|---|---|---|
| P1 | **No shared navigation/layout.** Each page hand-rolls its own header. Nav links are hidden on mobile (`display: { xs: 'none', sm: 'flex' }`) with **no hamburger/drawer** — Pricing/FAQ/Contact/B2B become unreachable on phones. | `src/app/components/user/LandingPage.tsx:59`; no `AppBar`/`Toolbar`/`Drawer` anywhere except `admin/AdminLayout.tsx` | Critical — users can't navigate |
| P2 | **Global theme typography is fixed.** `h1: 3.5rem`, `h2: 2.5rem`, `h3: 2rem`. Bare `<Typography variant="hN">` overflows; only components that override inline are safe. | `src/app/App.tsx:96-125` | High — headings overflow / clip |
| P3 | **Data tables overflow.** ReportViewer/UserDashboard/TerritoryComparison/SampleReport/B2BSolutions each contain 27–37 table-related elements, mostly raw `<Table>` **not** wrapped in `TableContainer`, with `minWidth` set on only ~3. | grep: `<Table>` count 26–34 per file vs `TableContainer` count 3–5 | Critical — horizontal page scroll, broken layout |
| P4 | **Calculators use hand-built fixed-width grids.** `minWidth: '1320px'` / `'1540px'` rows with fixed column widths (200/140/110px). | `src/app/components/user/WhatIfCalculator.tsx:523,539,590,593-604`; `PublicWhatIfCalculator.tsx` (15 fixed px widths) | Critical on phones |
| P5 | **Fixed multi-column grid.** `gridTemplateColumns: '140px 1fr 1fr 1fr', minWidth: 480`. | `src/app/components/user/ProjectDetailsPanel.tsx:163` | High — overflow < 480px |
| P6 | **`100vh` everywhere (27 files).** Mobile browser chrome makes `100vh` taller than the visible area → cut-off / scroll jump. | grep `100vh` across `src/app` | Medium — visual cut-off, layout jump |
| P7 | **No JS breakpoint awareness.** Zero `useMediaQuery` / `theme.breakpoints` usage, so components can't swap layouts (e.g. table → cards, render a Drawer). | grep returns 0 occurrences | Enabler gap |
| P8 | **No PWA infrastructure.** No manifest, no service worker, no app icons; `index.html` references `/favicon.svg` which is **missing** from `public/`. | `public/` contains only sample `.txt` files | Required for "make it a PWA" |

---

## 3. Mobile strategy

### 3.1 Breakpoints (standardize on MUI defaults)

Use MUI's default breakpoints everywhere — do not invent new ones:

| Token | Min width | Target |
|---|---|---|
| `xs` | 0 | phones (portrait) |
| `sm` | 600 | phones (landscape) / small tablets |
| `md` | 900 | tablets / small laptops |
| `lg` | 1200 | desktop (current baseline) |
| `xl` | 1536 | large desktop |

**Design baseline for QA:** 360×640 (small Android), 390×844 (iPhone 13/14), 768×1024 (iPad).

### 3.2 Foundation layer (build first — unblocks everything else)

1. **Responsive typography.** Replace the fixed font sizes in `src/app/App.tsx` with `responsiveFontSizes(theme)` (MUI helper) **or** explicit clamp/breakpoint sizes per variant. This fixes every bare `<Typography>` at once.
   ```ts
   import { createTheme, responsiveFontSizes } from '@mui/material/styles';
   let theme = createTheme({ /* …existing… */ });
   theme = responsiveFontSizes(theme);
   ```
   Then audit components that hard-code huge `fontSize` values and let the theme drive them where possible.

2. **`useBreakpoint` hook.** Add `src/app/hooks/useBreakpoint.ts` wrapping `useMediaQuery(theme.breakpoints.down('md'))` to expose `isMobile` / `isTablet`. This unblocks layout swaps (P7).
   ```ts
   export function useIsMobile() {
     return useMediaQuery((t: Theme) => t.breakpoints.down('md'));
   }
   ```

3. **`100dvh` migration.** Introduce a small helper / sx snippet `minHeight: { xs: '100dvh', /* fallback */ }` and replace `100vh` in the 27 files. Prefer `100dvh` with a `100vh` fallback for old browsers:
   ```ts
   sx={{ minHeight: '100vh', '@supports (min-height: 100dvh)': { minHeight: '100dvh' } }}
   ```

4. **Global overflow guard.** Add to `CssBaseline`/global CSS: `html, body { overflow-x: hidden; }` and `img, svg, video { max-width: 100%; }` as a safety net while components are migrated. (Treat as a backstop, not a fix — still remove the underlying fixed widths.)

### 3.3 Shared App Shell + mobile navigation (fixes P1)

Create a single `src/app/components/common/AppShell.tsx` (header + footer + `<Outlet/>` slot) and a `MobileNavDrawer.tsx`:

- **Desktop (`md+`):** keep the current horizontal nav.
- **Mobile (`< md`):** render a hamburger `IconButton` that opens a MUI `Drawer` (or `SwipeableDrawer`) listing all routes: Pricing, FAQ, Contact, B2B (auth-gated), Sample, What-If, Login/Sign-Up or Dashboard.
- Extract the duplicated header/footer markup from `LandingPage` (and the other pages that repeat it) into the shell so there is **one** nav to maintain.
- Wrap public routes with the shell in `App.tsx` via a layout route, leaving `admin/*` on `AdminLayout`.

This is the single highest-impact change.

### 3.4 Tables strategy (fixes P3 — biggest effort)

Two complementary patterns, chosen per table:

1. **Horizontal scroll wrapper (quick, universal).** Wrap every standalone `<Table>` in `<TableContainer sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>` and give the table a sensible `minWidth`. Prevents page overflow; table scrolls inside its own box.

2. **Card/stack transform (best UX for key tables).** For the most-viewed tables (TerritoryComparison matrix, dashboard reports list, report financial summaries), render a stacked "card per row" layout below `md` using `useIsMobile()`. Build a reusable `ResponsiveTable`/`DataCardList` component so this is consistent.

**Recommendation:** apply pattern (1) everywhere first (low risk, fast), then upgrade the top 3–4 tables to pattern (2).

### 3.5 Calculators strategy (fixes P4)

`WhatIfCalculator` / `PublicWhatIfCalculator` use fixed `1320–1540px` grids. Options, in priority order:

1. Below `md`, replace the wide grid with a **vertical card list** (one territory = one card, label/value pairs stacked). Best UX.
2. As an interim, wrap the existing grid in a horizontal-scroll container with a "swipe →" affordance, so it at least doesn't break the page.

Inputs (`minWidth: '240px'`, `'180px'`) should become `width: '100%'` / `minWidth: 0` with responsive `flexDirection: { xs: 'column', md: 'row' }`.

### 3.6 Targeted component fixes

- `ProjectDetailsPanel.tsx:163` — make grid responsive: `gridTemplateColumns: { xs: '1fr', sm: '140px 1fr 1fr 1fr' }`, drop the fixed `minWidth: 480` on `xs` (or wrap in scroll container).
- `IntroAnimation` (full-screen `position: fixed` overlay) — verify it doesn't trap scroll on mobile and consider a reduced-motion / lighter variant for low-end devices (`prefers-reduced-motion`).
- Modals/dialogs (`ChangePlanModal`, support widget) — use MUI `Dialog` `fullScreen` below `sm`.

---

## 4. PWA strategy (fixes P8)

### 4.1 Tooling

Add **`vite-plugin-pwa`** (Workbox under the hood) — the lowest-friction path for a Vite app. It generates the service worker, precaches the build, and injects the manifest link.

```bash
npm i -D vite-plugin-pwa
```

```ts
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';
// …
plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
    manifest: {
      name: 'Prodculator — Film Production Intelligence',
      short_name: 'Prodculator',
      description: 'Upload your script and receive investor-ready production intelligence reports.',
      theme_color: '#000000',
      background_color: '#000000',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/pwa-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Cache the app shell + static assets; network-first for API calls.
      navigateFallback: '/index.html',
      runtimeCaching: [
        { urlPattern: ({ url }) => url.pathname.startsWith('/api'),
          handler: 'NetworkFirst', options: { cacheName: 'api' } },
        { urlPattern: ({ request }) => request.destination === 'image',
          handler: 'CacheFirst', options: { cacheName: 'images' } },
      ],
    },
  }),
],
```

### 4.2 Assets to create (`public/`)

- `favicon.svg` (currently **missing** but referenced by `index.html`).
- `pwa-192.png`, `pwa-512.png`, `pwa-512-maskable.png` (gold-on-black brand).
- `apple-touch-icon.png` (180×180).
- `og-image.jpg` (referenced by existing OG tags — verify it exists/serves).

### 4.3 `index.html` additions

```html
<meta name="theme-color" content="#000000" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<!-- manifest link is injected by vite-plugin-pwa -->
```

### 4.4 In-app behaviors

- **Update prompt:** when the SW has a new version, show a notistack toast "New version available — Reload."
- **Install prompt (optional):** capture `beforeinstallprompt` and surface a subtle "Install app" CTA in the dashboard/footer.
- **Offline fallback:** a minimal offline page; the app shell precache covers navigation.
- **Caching caution:** never cache authenticated API responses with `CacheFirst`; use `NetworkFirst`/`NetworkOnly` for `/api/*` and anything user-specific. Coordinate with how Firebase auth tokens are sent.

### 4.5 Scope decision needed

Decide how much offline capability is required:
- **Installable + fast repeat loads** (app shell precache only) — recommended default, low risk.
- **Full offline report viewing** (cache report data) — larger effort, auth/cache-invalidation complexity. Recommend deferring to a later phase.

---

## 5. Phased rollout

| Phase | Goal | Work | Est. |
|---|---|---|---|
| **0. Foundation** | Unblock everything; no visual regressions | Responsive theme typography (P2), `useIsMobile` hook (P7), `100dvh` migration (P6), global overflow guard | 1–2 days |
| **1. Navigation** | Mobile users can navigate | `AppShell` + `MobileNavDrawer`, dedupe per-page headers/footers, wire layout route (P1) | 2–3 days |
| **2. Tables & grids** | Kill horizontal overflow | Wrap all tables in scroll containers; fix `ProjectDetailsPanel` & calculator grids (P3, P4, P5) | 3–4 days |
| **3. High-value UX** | Best mobile experience on key screens | Card/stack transforms for TerritoryComparison, UserDashboard reports, ReportViewer summaries, calculators | 3–5 days |
| **4. PWA** | Installable + offline-aware | `vite-plugin-pwa`, manifest, icons, meta tags, update toast (P8) | 1–2 days |
| **5. Polish & QA** | Ship-ready | Device matrix testing, Lighthouse PWA/Perf, a11y tap targets, reduced-motion | 1–2 days |

Phases 0→1→2 are sequential (each unblocks the next). Phase 4 (PWA) is independent and can run in parallel with 2–3.

---

## 6. Testing & QA

- **Device matrix:** iPhone SE (360w), iPhone 14 (390w), Pixel (412w), iPad (768w), desktop (1280w). Test in Chrome DevTools device mode + at least one real iOS Safari (for `100dvh`, safe-area insets, install behavior).
- **No-horizontal-scroll check:** automated test/assertion that `document.documentElement.scrollWidth <= clientWidth` at 360px on every public route.
- **Lighthouse:** PWA category must pass (installable, manifest, SW, offline). Track mobile Performance score.
- **Tap targets:** interactive elements ≥ 44×44px.
- **Reduced motion:** respect `prefers-reduced-motion` for `IntroAnimation`/motion components.
- **Regression:** existing Vitest suite must stay green; add a couple of `useIsMobile`-driven render tests for the table→card swap.

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Extracting per-page headers into `AppShell` changes many files | Do it page-by-page behind the shell; keep visual output identical at `md+` |
| Service worker cache serves stale assets after deploy | `registerType: 'autoUpdate'` + version-update toast; never `CacheFirst` HTML |
| Caching authenticated API data leaks across users | `NetworkFirst`/`NetworkOnly` for `/api/*`; scope caches; clear on logout |
| `responsiveFontSizes` shrinks headings components relied on | Audit hard-coded `fontSize` overrides; adjust per-variant if needed |
| Large refactor surface (heavy files: ReportViewer 1572 lines, SampleReport 1143) | Strict phasing; table scroll-wrapper pass is mechanical and low-risk first |

---

## 8. Acceptance criteria

- [ ] Every public route is usable at 360px width with **no horizontal page scroll**.
- [ ] Full navigation reachable on mobile via a hamburger drawer.
- [ ] Headings/body text scale sensibly on phones (no clipping/overflow).
- [ ] All data tables either scroll within their container or transform to cards.
- [ ] Calculators are usable on a phone (no 1500px grids forcing the page wide).
- [ ] App is installable; Lighthouse PWA checks pass; offline shows the app shell.
- [ ] `100vh` cut-off resolved (use `100dvh`).
- [ ] Existing test suite green.

---

## 9. Decisions (resolved)

1. **Offline depth:** Installable + fast app-shell loads only. No offline report/API data — `/api` always hits the network, so no user data is cached.
2. **Tablet treatment:** `sm`–`md` is treated as a "big phone" (single column). `useIsMobile()` returns true below `md`.
3. **Mobile nav:** Hamburger drawer (`MobileNavDrawer`) with Home/Pricing/FAQ/Contact/Sample/What-If + B2B (auth-only) and Login/Sign-Up or Dashboard.
4. **Brand assets:** Placeholder icons generated from the existing logo (`src/assets/2ac5…png`) padded onto the brand-black square canvas. **To be replaced** with final square icons later — just overwrite the files in `public/`.

---

## 10. Implementation status — branch `feat/mobile-pwa`

**Done & verified (typecheck + build + 91 tests green):**

- **Phase 0:** `responsiveFontSizes` applied to the theme; global `overflow-x: clip` + responsive media guard via `MuiCssBaseline`; `useBreakpoint` hook (`useIsMobile/useIsSmallPhone/useIsDesktop`); `100vh → 100dvh` across all 18 frontend files.
- **Phase 1:** `MobileNavDrawer` (hamburger + slide-out) wired into the LandingPage header; inline nav now collapses below `md` instead of vanishing.
- **Phase 2:** Every real `<Table>` confirmed wrapped in a scrolling `TableContainer` (wrapped the one unwrapped B2B preview table); `ProjectDetailsPanel` grid + calculator wide-grids confirmed inside `overflowX:'auto'` (no page-level overflow).
- **Phase 3:** Mobile card view added to `PublicWhatIfCalculator` (desktop table preserved, hidden below `md`; one card per territory below `md`).
- **Phase 4:** `vite-plugin-pwa` configured (`registerType: 'autoUpdate'`, precache-only, `/api` denylisted); web manifest + `sw.js` generated on build; placeholder icon set in `public/`; `index.html` theme-color/apple meta tags + fixed favicon reference.

**Follow-ups (same patterns, not yet applied):**

- Card transforms for `WhatIfCalculator` (Pro, 1540px grid — currently scrolls), `TerritoryComparison` (480px tables — currently scroll), and the `UserDashboard` reports table (already hides columns on `xs`).
- Optional "new version available — reload" toast via `virtual:pwa-register/react` (currently silent auto-update).
- Replace placeholder PWA icons with final square brand assets.
- Manual device-matrix QA + Lighthouse PWA audit (§6) — needs a real browser/device run.
