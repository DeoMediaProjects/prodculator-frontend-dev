import { Box, Container, Typography, Button } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useNavigate } from 'react-router';
import { CloudUpload, Assignment, LightModeOutlined, DarkModeOutlined } from '@mui/icons-material';
import footerLogo from '@/assets/prodculator-logo-white.png';
import { useAuth } from '@/app/contexts/AuthContext';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { IntroAnimation } from '@/app/components/common/IntroAnimation';
import { MobileNavDrawer } from '@/app/components/common/MobileNavDrawer';
import { PricingNavMenu } from '@/app/components/common/PricingNavMenu';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { SiteFooter } from '@/app/components/common/SiteFooter';
import { AccountMenu } from '@/app/components/common/AccountMenu';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);

  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <IntroAnimation />

      {/* Atmospheric gradient effect */}
      <Box
        sx={{
          position: 'absolute',
          right: '-20%',
          top: '20%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha(t.gold, 0.15)} 0%, ${alpha(t.gold, 0)} 70%)`,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <Box
        sx={{
          bgcolor: t.pageBg,
          borderBottom: `1px solid ${t.border}`,
          py: 3,
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

      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          minHeight: 'calc(100dvh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
          backgroundImage: `linear-gradient(${alpha(t.pageBg, 0.82)}, ${alpha(t.pageBg, 0.92)}), url(/landing-bg.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', maxWidth: '900px', mx: 'auto' }}>
            <Typography
              sx={{
                fontSize: { xs: '2.5rem', md: '3.5rem', lg: '4rem' },
                fontWeight: 700,
                lineHeight: 1.2,
                mb: 4,
                letterSpacing: '-0.02em',
              }}
            >
              <Box component="span" sx={{ color: t.gold }}>Turn your</Box>
              {' '}
              <Box component="span" sx={{ color: t.textPrimary }}>script</Box>
              {' '}
              <Box component="span" sx={{ color: t.gold }}>into</Box>
              <br />
              <Box component="span" sx={{ color: t.textPrimary }}>Production intelligence</Box>
              <br />
              <Box component="span" sx={{ color: t.gold, fontSize: '1.5rem' }}>with our Scripteligence tool</Box>
            </Typography>

            <Box sx={{ mb: 6 }}>
              <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' }, fontWeight: 700, color: t.textPrimary, mb: 1 }}>
                Upload your script.
              </Typography>
              <Typography sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' }, fontWeight: 700, color: t.gold, mb: 3 }}>
                Discover where it makes the most financial sense to shoot.
              </Typography>
              <Typography
                sx={{
                  fontSize: { xs: '0.95rem', md: '1rem' },
                  color: t.gold,
                  lineHeight: 1.6,
                  maxWidth: '800px',
                  mx: 'auto',
                  px: { xs: 2, md: 0 },
                }}
              >
                Prodculator analyses your screenplay to generate location recommendations, incentive estimates, and production insights, all delivered in one clear report.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', justifyContent: 'center', px: { xs: 2, md: 0 } }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/upload')}
                startIcon={<CloudUpload />}
                sx={{ px: 4, py: 1.5, fontSize: { xs: '0.9rem', md: '1rem' } }}
              >
                Upload Script
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/sample')}
                startIcon={<Assignment />}
                sx={{ px: 4, py: 1.5, fontSize: { xs: '0.9rem', md: '1rem' } }}
              >
                See Sample Report
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/what-if')}
                sx={{
                  px: 4,
                  py: 1.5,
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  animation: 'ctaGlow 2s ease-in-out infinite',
                  '@keyframes ctaGlow': {
                    '0%, 100%': { boxShadow: `0 0 6px 1px ${alpha(t.gold, 0.2)}` },
                    '50%': { boxShadow: `0 0 22px 8px ${alpha(t.gold, 0.65)}` },
                  },
                  '&:hover': {
                    animation: 'none',
                    boxShadow: `0 0 26px 10px ${alpha(t.gold, 0.7)}`,
                  },
                }}
              >
                Try What If Calculator
              </Button>
            </Box>

          </Box>
        </Container>
      </Box>

      <SiteFooter />
    </Box>
  );
}
