import { useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { usePromotion } from '@/app/hooks/usePromotion';

/**
 * Sticky promotional banner.
 *
 * Renders only when the API reports a promotion the checkout will actually apply.
 * That condition is the whole design: the amount a customer is charged comes from
 * Stripe, so a banner driven by a hardcoded percentage would keep advertising a
 * discount after the coupon expired, and a customer who clicked through would be
 * billed list price. Tying the banner to the same coupon the checkout uses makes
 * that divergence impossible rather than merely unlikely.
 *
 * Not dismissible, and deliberately so — a promotion that a visitor dismissed on the
 * landing page would be invisible on the pricing page, where it changes what they
 * decide. It is one line tall and does not overlay content.
 */
export function PromotionBanner() {
  const promotion = usePromotion();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement | null>(null);

  // Page headers in this app are `position: sticky; top: 0`. So is this banner, so
  // without an offset the two occupy the same 0 and overlap. Publishing the real
  // measured height as a CSS variable lets every sticky header sit below it, and
  // keeps working when the text wraps to two lines on a narrow screen — which a
  // hardcoded offset would not.
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) {
      root.style.setProperty('--promo-h', '0px');
      return;
    }
    const publish = () => root.style.setProperty('--promo-h', `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.setProperty('--promo-h', '0px');
    };
  }, [promotion.active]);

  if (!promotion.active) return null;

  return (
    <Box
      ref={ref}
      role="status"
      onClick={() => navigate('/pricing')}
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 1300,
        cursor: 'pointer',
        bgcolor: t.gold,
        color: mode === 'dark' ? '#000' : '#fff',
        px: 2,
        py: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        flexWrap: 'wrap',
        textAlign: 'center',
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: 13.5, letterSpacing: '0.01em' }}>
        {promotion.label}
      </Typography>
      <Typography
        sx={{
          fontWeight: 700,
          fontSize: 12.5,
          textDecoration: 'underline',
          opacity: 0.85,
        }}
      >
        See plans
      </Typography>
    </Box>
  );
}
