import { useMediaQuery, type Theme } from '@mui/material';

/**
 * Breakpoint helpers built on MUI's default breakpoints.
 *
 * Per the mobile plan we treat `sm`–`md` as a "big phone" (single column),
 * so `isMobile` is true for everything below the `md` (900px) breakpoint —
 * i.e. phones AND small tablets collapse to the mobile layout.
 *
 * Use these to swap layouts that can't be expressed with `sx` breakpoints
 * alone (e.g. rendering a Drawer, or a card list instead of a table).
 */
export function useIsMobile(): boolean {
  return useMediaQuery((theme: Theme) => theme.breakpoints.down('md'));
}

/** True only for phone-sized viewports (< 600px). */
export function useIsSmallPhone(): boolean {
  return useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
}

/** True for desktop / large-laptop viewports (>= 1200px). */
export function useIsDesktop(): boolean {
  return useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
}
