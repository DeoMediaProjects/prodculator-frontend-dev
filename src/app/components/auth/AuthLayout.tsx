import type { ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Box, Container, Button, Typography } from '@mui/material';
import { ArrowBack, LightModeOutlined, DarkModeOutlined } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { AuthBrandArt } from '@/app/components/auth/AuthBrandArt';
import logoMark from '@/assets/prodculator-logo-white.png';

// The brand panel is intentionally theme-independent (a fixed cinematic dark),
// separate from the form panel which follows the user's light/dark preference.
const PANEL_BG = '#0A0A08';

interface AuthLayoutProps {
  children: ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const navigate = useNavigate();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);

  const backButton = (
    <Button
      onClick={() => navigate('/')}
      startIcon={<ArrowBack sx={{ fontSize: 18 }} />}
      sx={{ fontWeight: 500, '&:hover': { bgcolor: 'transparent' } }}
    >
      Back to Home
    </Button>
  );

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex' }}>
      {/* Brand panel — desktop only. Nav (back) is anchored here so the two
          panels read as one component, not a page beside a backdrop. */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '42%',
          minWidth: 420,
          maxWidth: 560,
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflow: 'hidden',
          bgcolor: PANEL_BG,
          borderRight: '1px solid rgba(212, 175, 55, 0.15)',
          p: 6,
        }}
      >
        {/* Custom wireframe-globe artwork — bled off the bottom-right edge. */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            right: -110,
            bottom: -90,
            width: 620,
            height: 620,
            pointerEvents: 'none',
          }}
        >
          <AuthBrandArt />
        </Box>
        {/* Cinematic vignette */}
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 0 180px 50px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
          }}
        />

        {/* Back nav, anchored top-left of the brand panel */}
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            left: 24,
            zIndex: 2,
            '& .MuiButton-root': { color: 'rgba(255,255,255,0.75)', '&:hover': { color: '#fff' } },
          }}
        >
          {backButton}
        </Box>

        {/* Centered brand lockup */}
        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
          <img src={logoMark} alt="Prodculator" style={{ height: '42px', width: 'auto', marginBottom: 28 }} />
          <Typography sx={{ color: '#ffffff', fontWeight: 700, fontSize: '1.75rem', lineHeight: 1.3, mb: 2 }}>
            Turn your script into a production plan.
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Location strategy, tax incentives, and full budget breakdowns for producers, plus market intelligence to help studios and vendors grow operations.
          </Typography>
        </Box>
      </Box>

      {/* Form panel — follows the user's theme */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', bgcolor: t.pageBg }}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: t.pageBg,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            px: { xs: 2, sm: 4 },
            py: 2.5,
          }}
        >
          {/* Back nav only appears here on mobile (brand panel is hidden) */}
          <Box sx={{ display: { xs: 'block', md: 'none' }, '& .MuiButton-root': { color: t.textPrimary, '&:hover': { color: t.gold } } }}>
            {backButton}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <SegmentedToggle
            radius={12}
            value={mode}
            onChange={(v) => v !== mode && toggle()}
            options={[
              { value: 'light', icon: <LightModeOutlined sx={{ fontSize: 18 }} /> },
              { value: 'dark', icon: <DarkModeOutlined sx={{ fontSize: 18 }} /> },
            ]}
          />
        </Box>

        {/* m:'auto' centers when there's room, but lets tall forms scroll from
            the top instead of clipping (flex align-items:center would clip). */}
        <Box sx={{ flex: 1, display: 'flex', px: 2, pb: 4, overflowY: 'auto' }}>
          <Container maxWidth="sm" disableGutters sx={{ m: 'auto' }}>
            {children}
          </Container>
        </Box>
      </Box>
    </Box>
  );
}
