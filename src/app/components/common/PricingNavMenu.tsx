import { useState } from 'react';
import { Box, Button, Menu, MenuItem, Typography, Divider } from '@mui/material';
import { KeyboardArrowDown } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useGeoCurrency } from '@/app/hooks/useGeoCurrency';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

interface PricingMenuItem {
  name: string;
  priceUSD: string;
  priceGBP: string;
  description: string;
}

// Mirrors the plan data in components/user/Pricing.tsx and the B2B
// products in components/B2BSolutions.tsx, kept short for a nav preview.
const PLAN_ITEMS: PricingMenuItem[] = [
  { name: 'Explorer', priceUSD: '$0', priceGBP: '£0', description: 'Try the platform, 1 script' },
  { name: 'Single', priceUSD: '$1 one-off', priceGBP: '£0.79 one-off', description: '1 report, 1 territory' },
  { name: 'Professional', priceUSD: '$1/mo', priceGBP: '£0.79/mo', description: '1 script a month, up to 3 territories' },
  { name: 'Producer', priceUSD: '$1/mo', priceGBP: '£0.79/mo', description: '3 scripts a month, up to 5 territories each' },
  { name: 'Studio', priceUSD: '$1/mo', priceGBP: '£0.79/mo', description: '10 scripts a month, up to 7 territories each' },
];

const B2B_ITEM: PricingMenuItem = {
  name: 'B2B Solutions',
  priceUSD: 'From $2/mo',
  priceGBP: 'From £1.60/mo',
  description: 'Production intelligence for studios, vendors and agencies',
};

export function PricingNavMenu() {
  const navigate = useNavigate();
  const { isUK } = useGeoCurrency();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const price = (item: PricingMenuItem) => (isUK ? item.priceGBP : item.priceUSD);

  const goTo = (path: string) => {
    setAnchorEl(null);
    navigate(path);
  };

  const renderItem = (item: PricingMenuItem, path: string) => (
    <MenuItem
      key={item.name}
      onClick={() => goTo(path)}
      sx={{
        px: 2.5,
        py: 1.25,
        alignItems: 'flex-start',
        flexDirection: 'column',
        gap: 0.25,
        '&:hover': { bgcolor: t.goldDim },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 3, width: '100%' }}>
        <Typography sx={{ color: t.textPrimary, fontWeight: 600, fontSize: '0.95rem' }}>
          {item.name}
        </Typography>
        <Typography sx={{ color: t.gold, fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
          {price(item)}
        </Typography>
      </Box>
      <Typography sx={{ color: t.textFaint, fontSize: '0.8rem' }}>
        {item.description}
      </Typography>
    </MenuItem>
  );

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
