import { useEffect, useState } from 'react';
import type { Styles } from 'react-joyride';
import type { tokens } from '@/app/theme/AppTheme';

type Tokens = ReturnType<typeof tokens>;

// Shared, theme-aware styling so the dashboard tour and the wizard tour speak
// the same visual language (consistent component vocabulary, per the product
// register). Kept close to the app's own surfaces: card background, gold
// primary, generous radii, a soft elevation.
export function buildTourStyles(t: Tokens, mode: 'light' | 'dark'): Partial<Styles> {
  return {
    options: {
      zIndex: 13000,
      primaryColor: t.gold,
      backgroundColor: t.cardBg,
      arrowColor: t.cardBg,
      textColor: t.textPrimary,
      overlayColor: mode === 'dark' ? 'rgba(0,0,0,0.66)' : 'rgba(20,18,12,0.42)',
    },
    spotlight: { borderRadius: 14 },
    tooltip: {
      borderRadius: 16,
      border: `1px solid ${t.border}`,
      padding: 0,
      boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
    },
    tooltipContainer: { textAlign: 'left' },
    tooltipTitle: { fontWeight: 800, fontSize: 16, padding: '18px 20px 0', color: t.textPrimary },
    tooltipContent: { color: t.textSecondary, fontSize: 13.75, lineHeight: 1.65, padding: '8px 20px 2px' },
    tooltipFooter: { padding: '6px 16px 14px', marginTop: 4 },
    buttonNext: {
      borderRadius: 10,
      fontWeight: 700,
      fontSize: 13.5,
      color: mode === 'dark' ? '#000' : '#fff',
      backgroundColor: t.gold,
      padding: '9px 18px',
      outline: 'none',
    },
    buttonBack: { color: t.textSecondary, fontWeight: 600, fontSize: 13.5, marginRight: 8 },
    buttonSkip: { color: t.textSecondary, fontSize: 13 },
    // The tooltip sets padding: 0, so the close button needs explicit placement
    // or it lands over the copy instead of in the top-right corner.
    buttonClose: {
      height: 11,
      width: 11,
      padding: 12,
      right: 6,
      top: 6,
      color: t.textSecondary,
    },
  };
}

export const tourLocale = { back: 'Back', close: 'Close', last: 'Done', next: 'Next', skip: 'Skip' };

// Honour reduced-motion: react-floater's movement is disabled so steps cut
// instead of glide, matching the app's accessibility posture.
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
}
