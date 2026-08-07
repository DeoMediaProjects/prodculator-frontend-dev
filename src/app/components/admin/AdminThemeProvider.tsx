import { useMemo, type ReactNode } from 'react';
import { ThemeProvider, createTheme, useTheme } from '@mui/material';

/**
 * Native system-UI stack for the admin console.
 *
 * The platform's brand face is Montserrat, a geometric *display* sans. It is
 * right for the customer-facing surfaces and wrong for this one: the product
 * register bans display fonts in "UI labels, buttons, data", which is most of
 * what an admin console is. Montserrat's wide geometric forms and near-uniform
 * stroke are what made dense tables and 11px labels here read as slightly soft.
 *
 * A system stack is the register's own recommendation for product UI, and it
 * earns its place on merit rather than convention:
 *
 * - it resolves to a face designed for interface density (Segoe UI Variable on
 *   Windows, SF Pro on macOS), so small sizes stay legible;
 * - it costs no network request and cannot flash unstyled;
 * - it is not a named webfont, so it avoids the whole saturated set that reads
 *   as generic (Inter, Geist, Roboto and company).
 *
 * Montserrat is untouched everywhere else, so brand identity is preserved and
 * the split is meaningful: brand voice for customers, tool voice for staff.
 */
export const ADMIN_FONT_STACK = [
  'ui-sans-serif',
  'system-ui',
  '-apple-system',
  'BlinkMacSystemFont',
  '"Segoe UI Variable Text"',
  '"Segoe UI"',
  'Helvetica',
  'Arial',
  'sans-serif',
].join(', ');

/** Monospace for ids, tokens and JSON, where character shape has to be exact. */
export const ADMIN_MONO_STACK = [
  'ui-monospace',
  'SFMono-Regular',
  '"SF Mono"',
  'Menlo',
  'Consolas',
  '"Liberation Mono"',
  'monospace',
].join(', ');

/**
 * Applies the admin type system on top of whatever the active light/dark theme
 * is, so the theme toggle keeps working untouched.
 *
 * The scale is a fixed rem ramp at a tight ratio rather than the platform's
 * fluid `responsiveFontSizes` output: admins view at a consistent DPI, and a
 * heading that shrinks inside a panel looks worse, not better.
 */
export function AdminThemeProvider({ children }: { children: ReactNode }) {
  const base = useTheme();

  const theme = useMemo(
    () => createTheme(base, {
      typography: {
        fontFamily: ADMIN_FONT_STACK,
        // ~1.15 ratio. More type roles live here than on a brand surface, so
        // exaggerated contrast between steps just creates noise.
        h1: { fontFamily: ADMIN_FONT_STACK, fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.015em' },
        h2: { fontFamily: ADMIN_FONT_STACK, fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.013em' },
        h3: { fontFamily: ADMIN_FONT_STACK, fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.011em' },
        h4: { fontFamily: ADMIN_FONT_STACK, fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.009em' },
        h5: { fontFamily: ADMIN_FONT_STACK, fontSize: '1.1rem', fontWeight: 700 },
        h6: { fontFamily: ADMIN_FONT_STACK, fontSize: '0.975rem', fontWeight: 700 },
        body1: { fontFamily: ADMIN_FONT_STACK, fontSize: '0.9rem' },
        body2: { fontFamily: ADMIN_FONT_STACK, fontSize: '0.825rem' },
        button: { fontFamily: ADMIN_FONT_STACK, textTransform: 'none', fontWeight: 600 },
        caption: { fontFamily: ADMIN_FONT_STACK, fontSize: '0.75rem' },
        overline: { fontFamily: ADMIN_FONT_STACK, fontWeight: 700, letterSpacing: '0.14em' },
      },
      components: {
        // Tabular figures throughout the console. Proportional digits make a
        // column of numbers ragged and, worse, make two figures of the same
        // magnitude look different lengths, which is the one thing a revenue
        // table must never do.
        MuiCssBaseline: {
          styleOverrides: {
            '.admin-shell': { fontVariantNumeric: 'tabular-nums' },
          },
        },
        MuiTableCell: {
          styleOverrides: {
            root: { fontVariantNumeric: 'tabular-nums', fontSize: '0.85rem' },
            head: { fontWeight: 700, letterSpacing: '0.02em' },
          },
        },
      },
    }),
    [base],
  );

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
