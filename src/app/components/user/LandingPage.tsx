import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import { LightModeOutlined, DarkModeOutlined } from '@mui/icons-material';
import footerLogo from '@/assets/prodculator-logo-white.png';
import { useAuth } from '@/app/contexts/AuthContext';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { IntroAnimation } from '@/app/components/common/IntroAnimation';
import { MobileNavDrawer } from '@/app/components/common/MobileNavDrawer';
import { PricingNavMenu } from '@/app/components/common/PricingNavMenu';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { SiteFooter } from '@/app/components/common/SiteFooter';
import { LandingSections } from '@/app/components/user/landing/LandingSections';
import { AccountMenu } from '@/app/components/common/AccountMenu';

/** The four things a cold visitor is buying, stated once under the hero. */
const PROOF_POINTS = [
  'Territory comparison',
  'Tax incentive analysis',
  'What-if scenarios',
  'Decision-ready reports',
];

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);

  // No overflow:hidden on the root below. An ancestor with a hidden overflow
  // becomes the scrollport a sticky child is measured against, which quietly
  // breaks the sticky header.
  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh', position: 'relative' }}>
      <IntroAnimation />

      {/* Header */}
      <Box
        sx={{
          bgcolor: t.pageBg,
          borderBottom: `1px solid ${t.border}`,
          py: 2,
          position: 'sticky',
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ width: '100%', position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <img
                src={footerLogo}
                alt="Prodculator"
                style={{ height: '40px', width: 'auto', filter: mode === 'light' ? 'invert(1)' : 'none' }}
              />
            </Box>
            <Box
              sx={{
                display: { xs: 'none', md: 'flex' },
                gap: 1,
                alignItems: 'center',
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <PricingNavMenu />
              <Button
                variant="text"
                onClick={() => navigate('/faq')}
                sx={{ color: t.textPrimary, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: t.goldDim } }}
              >
                FAQ
              </Button>
              <Button
                variant="text"
                onClick={() => navigate('/contact')}
                sx={{ color: t.textPrimary, fontWeight: 600, textTransform: 'none', '&:hover': { bgcolor: t.goldDim } }}
              >
                Contact
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 1, md: 2 }, alignItems: 'center', flexWrap: 'wrap' }}>
              <SegmentedToggle
                radius={12}
                value={mode}
                onChange={(v) => v !== mode && toggle()}
                options={[
                  { value: 'light', icon: <LightModeOutlined sx={{ fontSize: 18 }} /> },
                  { value: 'dark', icon: <DarkModeOutlined sx={{ fontSize: 18 }} /> },
                ]}
              />
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: { xs: 1, md: 2 }, alignItems: 'center' }}>
                {isAuthenticated ? (
                  <AccountMenu />
                ) : (
                  <>
                    <Button variant="outlined" onClick={() => navigate('/login')} sx={{ px: { xs: 2, md: 3 } }}>
                      Login
                    </Button>
                    <Button variant="contained" onClick={() => navigate('/signup')} sx={{ px: { xs: 2, md: 3 } }}>
                      Sign Up
                    </Button>
                  </>
                )}
              </Box>
              <MobileNavDrawer />
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero — centred, per the paid-traffic layout. A cold visitor arriving from
          an ad gets the category, the promise and the action in one screen. */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          px: 2,
          py: { xs: 8, md: 12 },
          background:
            mode === 'dark'
              ? 'radial-gradient(circle at 50% 22%, rgba(212,175,55,0.10), transparent 34%)'
              : 'radial-gradient(circle at 50% 22%, rgba(184,148,31,0.08), transparent 34%)',
        }}
      >
        <Container maxWidth="md">
          <Typography
            sx={{
              color: t.goldText,
              fontSize: 13,
              fontWeight: 850,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            Production intelligence from your screenplay
          </Typography>

          <Typography
            component="h1"
            sx={{
              fontSize: { xs: '2.8rem', sm: '3.5rem', md: '4.4rem' },
              fontWeight: 700,
              lineHeight: 1.02,
              letterSpacing: '-0.045em',
              color: t.textPrimary,
              textWrap: 'balance',
              my: 2.25,
            }}
          >
            <Box component="span" sx={{ color: t.goldText }}>
              Turn your script into
            </Box>
            <br />
            Production intelligence.
          </Typography>

          <Typography
            sx={{
              color: t.textSecondary,
              fontSize: { xs: '1.0625rem', md: '1.25rem' },
              lineHeight: 1.6,
              maxWidth: 760,
              mx: 'auto',
              mb: 3.5,
              textWrap: 'pretty',
            }}
          >
            <Box component="span" sx={{ color: t.textPrimary, fontWeight: 600 }}>
              Upload your script. Discover where it makes the most financial sense to shoot.
            </Box>
            <br />
            Compare territories, incentives and production scenarios before committing
            to a production location.
          </Typography>

          <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="contained" size="large" sx={{ px: 3, py: 1.4 }} onClick={() => navigate('/upload')}>
              Upload Script
            </Button>
            <Button variant="outlined" size="large" sx={{ px: 3, py: 1.4 }} onClick={() => navigate('/sample')}>
              See Sample Report
            </Button>
            <Button variant="outlined" size="large" sx={{ px: 3, py: 1.4 }} onClick={() => navigate('/what-if')}>
              Try What If Calculator
            </Button>
          </Box>

          <Typography sx={{ color: t.textFaint, fontSize: 13, mt: 2 }}>
            You review, sign and accept the required terms before any screenplay is uploaded.
          </Typography>

          <Box
            sx={{
              display: 'flex',
              gap: { xs: 2, md: 3 },
              justifyContent: 'center',
              flexWrap: 'wrap',
              mt: 4,
            }}
          >
            {PROOF_POINTS.map((point) => (
              <Box key={point} sx={{ display: 'flex', alignItems: 'center', gap: 0.9 }}>
                <Box component="span" sx={{ color: t.success, fontWeight: 900, fontSize: 14 }} aria-hidden>
                  ✓
                </Box>
                <Typography sx={{ color: t.textSecondary, fontSize: 13.5 }}>{point}</Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      <LandingSections />

      <SiteFooter />
    </Box>
  );
}
