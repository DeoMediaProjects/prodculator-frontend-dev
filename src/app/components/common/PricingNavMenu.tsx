import { useState } from 'react';
import { Box, Button, Menu, MenuItem, Typography } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePromotion } from '@/app/hooks/usePromotion';

/**
 * The Pricing nav dropdown: two ways in, not a price list.
 *
 * It used to enumerate all six products with their monthly figures. Two of those
 * figures move with the billing cycle, the currency and the launch coupon, so the
 * menu was carrying a second copy of the pricing page's hardest logic in a surface
 * a visitor sees for two seconds. It sends them to the right side of /pricing
 * instead, where the figures are computed once and are correct by construction.
 *
 * `?audience=` is read by the pricing page and then cleared from the URL.
 */

interface AudienceOption {
  label: string;
  /** Value the pricing page's toggle understands. */
  audience: 'individual' | 'business';
  /** The plans on this side, named so the menu still says what is behind each door. */
  plans: string;
  /** Backend plan keys that sit on this side, for the "current plan" marker. */
  planKeys: string[];
}

const OPTIONS: AudienceOption[] = [
  {
    label: 'For individuals',
    audience: 'individual',
    plans: 'Explorer, Single Report, Professional and Producer',
    planKeys: ['free', 'professional', 'producer'],
  },
  {
    label: 'For Businesses',
    audience: 'business',
    plans: 'Studio and Business Intelligence Solutions',
    planKeys: ['studio'],
  },
];

export function PricingNavMenu() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { user, isAuthenticated } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const promotion = usePromotion();
  const open = Boolean(anchorEl);

  const currentPlanKey = isAuthenticated ? (user?.plan || 'free') : null;

  const goTo = (audience: string) => {
    setAnchorEl(null);
    navigate(`/pricing?audience=${audience}`);
  };

  return (
    <Box>
      <Button
        variant="text"
        onClick={(e) => setAnchorEl(open ? null : e.currentTarget)}
        endIcon={
          <KeyboardArrowDown
            sx={{
              fontSize: 20,
              transition: 'transform 120ms ease',
              transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        }
        sx={{
          color: t.textPrimary,
          fontWeight: 600,
          textTransform: 'none',
          '&:hover': { bgcolor: t.goldDim },
        }}
      >
        Pricing
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transitionDuration={{ enter: 120, exit: 90 }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 320,
              bgcolor: t.cardBg,
              border: `1px solid ${t.border}`,
              borderRadius: 2,
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.45)',
              py: 0.5,
            },
          },
        }}
      >
        {/* The percentage comes from the coupon the checkout applies, never from a
            constant here — so it disappears with the coupon rather than outliving it. */}
        {promotion.active && (
          <Box sx={{ px: 2.5, py: 1.25, bgcolor: t.goldDim, borderBottom: `1px solid ${t.border}` }}>
            <Typography sx={{ color: t.goldText, fontWeight: 800, fontSize: '0.72rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {promotion.percentOff}% off
            </Typography>
            <Typography sx={{ color: t.textSecondary, fontSize: '0.75rem', mt: 0.25 }}>
              {promotion.label}
            </Typography>
          </Box>
        )}

        {OPTIONS.map((option) => {
          const isCurrent = !!currentPlanKey && option.planKeys.includes(currentPlanKey);
          return (
            <MenuItem
              key={option.audience}
              onClick={() => goTo(option.audience)}
              sx={{
                px: 2.5,
                py: 1.5,
                alignItems: 'flex-start',
                flexDirection: 'column',
                gap: 0.25,
                bgcolor: isCurrent ? t.goldDim : 'transparent',
                borderLeft: isCurrent ? `2px solid ${t.gold}` : '2px solid transparent',
                '&:hover': { bgcolor: t.goldDim },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography sx={{ color: t.textPrimary, fontWeight: 600, fontSize: '0.95rem' }}>
                  {option.label}
                </Typography>
                {isCurrent && (
                  <Typography
                    component="span"
                    sx={{
                      color: t.gold, border: `1px solid ${t.gold}`,
                      fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
                      textTransform: 'uppercase', px: 0.75, py: 0.1, borderRadius: '6px', lineHeight: 1.5,
                    }}
                  >
                    Your plan
                  </Typography>
                )}
              </Box>
              <Typography sx={{ color: t.textFaint, fontSize: '0.8rem', whiteSpace: 'normal' }}>
                {option.plans}
              </Typography>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
