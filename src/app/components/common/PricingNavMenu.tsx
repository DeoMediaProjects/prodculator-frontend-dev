import { useState } from 'react';
import { Box, Button, Menu, MenuItem, Typography, Divider } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useGeoCurrency } from '@/app/hooks/useGeoCurrency';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { BI_PRICING, PLAN_PRICING } from '@/services/stripe.service';

// Maps the backend plan key on the user to the plan name shown in this menu, so
// a logged-in subscriber sees which plan they're currently on. "Single" is a
// one-off purchase, not a standing plan, so it's intentionally not mapped.
const PLAN_KEY_TO_NAME: Record<string, string> = {
  free: 'Explorer',
  professional: 'Professional',
  producer: 'Producer',
  studio: 'Studio',
};

interface PricingMenuItem {
  name: string;
  priceUSD: string;
  priceGBP: string;
  description: string;
}

// Prices are derived from PLAN_PRICING, never written here. This menu had its
// own hardcoded copy that still advertised the $1/£0.79 test amounts after the
// pricing page was corrected — a third place the same numbers lived, and the
// one users see first. Deriving them means it cannot fall behind again.
const PLAN_ITEMS: PricingMenuItem[] = [
  {
    name: 'Explorer',
    priceUSD: 'Free',
    priceGBP: 'Free',
    description: 'Try the platform, 1 trial report',
  },
  {
    name: 'Single',
    priceUSD: `$${PLAN_PRICING.singleReport.monthlyUSD} one-off`,
    priceGBP: `£${PLAN_PRICING.singleReport.monthlyGBP} one-off`,
    description: '1 report, 1 territory',
  },
  {
    name: 'Professional',
    priceUSD: `$${PLAN_PRICING.professional.monthlyUSD}/mo`,
    priceGBP: `£${PLAN_PRICING.professional.monthlyGBP}/mo`,
    description: '1 script a month, up to 3 territories',
  },
  {
    name: 'Producer',
    priceUSD: `$${PLAN_PRICING.producer.monthlyUSD}/mo`,
    priceGBP: `£${PLAN_PRICING.producer.monthlyGBP}/mo`,
    description: '3 scripts a month, up to 5 territories each',
  },
  {
    name: 'Studio',
    priceUSD: `$${PLAN_PRICING.studio.monthlyUSD}/mo`,
    priceGBP: `£${PLAN_PRICING.studio.monthlyGBP}/mo`,
    description: '10 scripts a month, up to 7 territories each',
  },
];

// Client-facing surfaces say "Business Intelligence", never "B2B".
//
// Quoted in GBP whatever the visitor's geo, because the packages have no USD
// price. The previous "from $2/mo" was a placeholder from before they were
// priced and understated the real floor by two orders of magnitude.
const B2B_ITEM: PricingMenuItem = {
  name: 'Business Intelligence Solutions',
  priceUSD: `From £${BI_PRICING.lowestMonthlyGBP}/mo`,
  priceGBP: `From £${BI_PRICING.lowestMonthlyGBP}/mo`,
  description: 'Production intelligence for studios, vendors and agencies',
};

export function PricingNavMenu() {
  const navigate = useNavigate();
  const { isUK } = useGeoCurrency();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { user, isAuthenticated } = useAuth();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const currentPlanName = isAuthenticated ? PLAN_KEY_TO_NAME[user?.plan || 'free'] : null;

  const price = (item: PricingMenuItem) => (isUK ? item.priceGBP : item.priceUSD);

  const goTo = (path: string) => {
    setAnchorEl(null);
    navigate(path);
  };

  const renderItem = (item: PricingMenuItem, path: string) => {
    const isCurrent = item.name === currentPlanName;
    return (
    <MenuItem
      key={item.name}
      onClick={() => goTo(path)}
      sx={{
        px: 2.5,
        py: 1.25,
        alignItems: 'flex-start',
        flexDirection: 'column',
        gap: 0.25,
        // Subtly mark the plan the user is currently on.
        bgcolor: isCurrent ? t.goldDim : 'transparent',
        borderLeft: isCurrent ? `2px solid ${t.gold}` : '2px solid transparent',
        '&:hover': { bgcolor: t.goldDim },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 3, width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: t.textPrimary, fontWeight: 600, fontSize: '0.95rem' }}>
            {item.name}
          </Typography>
          {isCurrent && (
            <Typography
              component="span"
              sx={{
                color: t.gold, bgcolor: 'transparent', border: `1px solid ${t.gold}`,
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.06em',
                textTransform: 'uppercase', px: 0.75, py: 0.1, borderRadius: '6px', lineHeight: 1.5,
              }}
            >
              Current plan
            </Typography>
          )}
        </Box>
        <Typography sx={{ color: t.gold, fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {price(item)}
        </Typography>
      </Box>
      <Typography sx={{ color: t.textFaint, fontSize: '0.8rem' }}>
        {item.description}
      </Typography>
    </MenuItem>
    );
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
        {PLAN_ITEMS.map((item) => renderItem(item, '/pricing'))}
        <Divider sx={{ my: 0.5, borderColor: t.border }} />
        {renderItem(B2B_ITEM, '/b2b')}
      </Menu>
    </Box>
  );
}
