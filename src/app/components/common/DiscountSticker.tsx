import { Box } from '@mui/material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { usePromotion } from '@/app/hooks/usePromotion';

interface DiscountStickerProps {
  /** Plan key the sticker sits on. Checked against the coupon's own scope. */
  planType: string;
  /** Slightly smaller variant, for the denser homepage plan strip. */
  compact?: boolean;
}

/**
 * The launch discount, stated as a sticker on the plan that actually receives it.
 *
 * The percentage is never written here. It comes from /api/payments/promotion,
 * which reports the Stripe coupon the checkout will apply — so the sticker cannot
 * outlive the coupon or disagree with the amount charged. It also renders nothing
 * unless the coupon is scoped to this plan: a Stripe coupon covers specific
 * products, and a "40% off" sticker on a plan billed in full is the exact
 * show-one-price-charge-another failure the promotion endpoint exists to prevent.
 *
 * Rotated and pinned to the card corner rather than sat in the flow, so it reads as
 * a sticker applied to the plan rather than as another badge competing with the
 * positioning label already centred on the card's top edge.
 */
export function DiscountSticker({ planType, compact = false }: DiscountStickerProps) {
  const promotion = usePromotion();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  if (!promotion.active) return null;
  // Empty `plans` means the coupon is unscoped and covers everything.
  if (promotion.plans.length && !promotion.plans.includes(planType.toLowerCase())) {
    return null;
  }

  const size = compact ? 58 : 72;

  return (
    <Box
      aria-label={`${promotion.percentOff} percent off`}
      sx={{
        position: 'absolute',
        top: compact ? -14 : -18,
        right: compact ? -10 : -14,
        zIndex: 3,
        width: size,
        height: size,
        borderRadius: '50%',
        bgcolor: t.gold,
        color: mode === 'dark' ? '#000' : '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 1,
        transform: 'rotate(-12deg)',
        boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
        // Reads as applied on top of the card, not cut into it.
        border: `2px solid ${t.pageBg}`,
        pointerEvents: 'none',
      }}
    >
      <Box
        component="span"
        sx={{
          fontWeight: 900,
          fontSize: compact ? 17 : 21,
          letterSpacing: '-0.02em',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {promotion.percentOff}%
      </Box>
      <Box
        component="span"
        sx={{
          fontWeight: 800,
          fontSize: compact ? 8 : 9.5,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          mt: 0.25,
        }}
      >
        Off
      </Box>
    </Box>
  );
}
