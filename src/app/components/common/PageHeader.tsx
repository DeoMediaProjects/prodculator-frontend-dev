import type { ReactNode } from 'react';
import { Box, Button } from '@mui/material';
import { ArrowBack, LightModeOutlined, DarkModeOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { AccountMenu } from '@/app/components/common/AccountMenu';
import logoMark from '@/assets/prodculator-logo-white.png';

interface PageHeaderProps {
  /** Extra controls rendered before the theme toggle (e.g. page-specific CTAs). */
  actions?: ReactNode;
}

/**
 * The one header shared across every top-level page: back button flush left,
 * logo right after it, then page-specific actions, theme toggle, and either
 * the account menu (logged in) or Log In / Sign Up (guest) flush right.
 * Sticky, no Container wrapper so it's edge-aligned the same way everywhere.
 */
export function PageHeader({ actions }: PageHeaderProps) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        bgcolor: t.pageBg,
        borderBottom: `1px solid ${t.border}`,
        py: 2,
        px: { xs: 2, sm: 4 },
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 } }}>
          <Button
            startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
            onClick={() => navigate('/')}
            sx={{ color: t.textSecondary, fontWeight: 600, '&:hover': { color: t.gold, bgcolor: 'transparent' } }}
          >
            Back to Home
          </Button>
          <img
            src={logoMark}
            alt="Prodculator"
            onClick={() => navigate('/')}
            style={{ height: 30, width: 'auto', cursor: 'pointer', filter: mode === 'light' ? 'invert(1)' : 'none' }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
          {actions}
          <SegmentedToggle
            radius={12}
            value={mode}
            onChange={(v) => v !== mode && toggle()}
            options={[
              { value: 'light', icon: <LightModeOutlined sx={{ fontSize: 18 }} /> },
              { value: 'dark', icon: <DarkModeOutlined sx={{ fontSize: 18 }} /> },
            ]}
          />
          {isAuthenticated ? (
            <AccountMenu />
          ) : (
            <>
              <Button variant="outlined" onClick={() => navigate('/login')} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                Log In
              </Button>
              <Button variant="contained" onClick={() => navigate('/signup')}>
                Sign Up
              </Button>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
