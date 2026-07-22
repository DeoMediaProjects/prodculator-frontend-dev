import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ThemeProvider, CssBaseline, createTheme, responsiveFontSizes, type Theme } from '@mui/material';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'prodculator-theme-mode';

// ── Palette tokens per mode ───────────────────────────────────────────────────
// Grey/low-contrast text is deliberately avoided: `text.secondary` is a
// clearly-legible tone in both modes (the client asked for visible fonts).
const TOKENS = {
  dark: {
    pageBg: '#000000',
    sidebarBg: '#000000',
    cardBg: '#0F0F0F',
    cardBgAlt: '#151515',
    border: 'rgba(255,255,255,0.08)',
    borderSoft: 'rgba(255,255,255,0.05)',
    gold: '#D4AF37',
    goldBright: '#E9C44C',
    goldDim: 'rgba(212,175,55,0.10)',
    textPrimary: '#FFFFFF',
    textSecondary: '#C7C1B5', // brightened for readability on dark surfaces
    textFaint: '#948E84',     // still clearly legible, not a dim grey
    success: '#4ED08A',
    warning: '#E4A93A',
    error: '#E5686D',
    inputBg: '#0C0C0C',
  },
  light: {
    pageBg: '#F3EFE7',
    sidebarBg: '#FBF9F4',
    cardBg: '#FFFFFF',
    cardBgAlt: '#FBFAF7',
    border: 'rgba(0,0,0,0.10)',
    borderSoft: 'rgba(0,0,0,0.07)',
    gold: '#B8941F',
    goldBright: '#C9A227',
    goldDim: 'rgba(184,148,31,0.12)',
    textPrimary: '#1C1A16',
    textSecondary: '#57534A', // legible, not faint grey
    textFaint: '#8A857C',
    success: '#1F9D57',
    warning: '#B7770D',
    error: '#C0392B',
    inputBg: '#FFFFFF',
  },
} as const;

export function tokens(mode: ThemeMode) {
  return TOKENS[mode];
}

export function createAppTheme(mode: ThemeMode): Theme {
  const t = TOKENS[mode];
  let theme = createTheme({
    palette: {
      mode,
      primary: { main: t.gold, light: t.goldBright, dark: t.gold, contrastText: mode === 'dark' ? '#000000' : '#FFFFFF' },
      secondary: { main: t.goldBright, contrastText: '#000000' },
      background: { default: t.pageBg, paper: t.cardBg },
      text: { primary: t.textPrimary, secondary: t.textSecondary },
      success: { main: t.success },
      warning: { main: t.warning },
      error: { main: t.error },
      divider: t.border,
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      h1: { fontSize: '3.5rem', fontWeight: 700, color: t.textPrimary },
      h2: { fontSize: '2.5rem', fontWeight: 700, color: t.textPrimary },
      h3: { fontSize: '2rem', fontWeight: 700, color: t.textPrimary },
      h4: { fontSize: '1.9rem', fontWeight: 700, color: t.textPrimary },
      h5: { fontSize: '1.25rem', fontWeight: 700, color: t.textPrimary },
      h6: { fontSize: '1rem', fontWeight: 700, color: t.textPrimary },
      body1: { fontSize: '1rem', color: t.textPrimary },
      body2: { fontSize: '0.875rem', color: t.textSecondary },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: { overflowX: 'clip' },
          body: { overflowX: 'clip', backgroundColor: t.pageBg },
          'img, video': { maxWidth: '100%' },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: '10px', padding: '10px 20px', fontWeight: 700 },
          contained: {
            backgroundColor: t.gold, color: mode === 'dark' ? '#000' : '#fff',
            boxShadow: 'none',
            '&:hover': { backgroundColor: t.goldBright, boxShadow: 'none' },
          },
          outlined: {
            borderColor: t.border, color: t.textPrimary,
            '&:hover': { borderColor: t.gold, backgroundColor: t.goldDim },
          },
          text: { color: t.gold },
        },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none', backgroundColor: t.cardBg } },
      },
      MuiCard: {
        styleOverrides: { root: { backgroundImage: 'none', backgroundColor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 14 } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: t.inputBg,
            '& fieldset': { borderColor: t.border },
            '&:hover fieldset': { borderColor: t.gold },
            '&.Mui-focused fieldset': { borderColor: t.gold },
          },
          input: { color: t.textPrimary },
        },
      },
      MuiInputLabel: { styleOverrides: { root: { color: t.textSecondary } } },
    },
  });
  theme = responsiveFontSizes(theme);
  return theme;
}

// ── Mode context ──────────────────────────────────────────────────────────────
interface ThemeModeContextValue {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (m: ThemeMode) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}

function readInitialMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* localStorage unavailable */
  }
  return 'dark';
}

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readInitialMode);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    try {
      localStorage.setItem(STORAGE_KEY, m);
    } catch {
      /* ignore */
    }
  };
  const toggle = () => setMode(mode === 'dark' ? 'light' : 'dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const theme = useMemo(() => createAppTheme(mode), [mode]);
  const value = useMemo(() => ({ mode, toggle, setMode }), [mode]);

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
