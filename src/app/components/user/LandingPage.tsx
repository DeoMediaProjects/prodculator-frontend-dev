import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import { CloudUpload, LockOutlined, LightModeOutlined, DarkModeOutlined } from '@mui/icons-material';
import footerLogo from '@/assets/prodculator-logo-white.png';
import { useAuth } from '@/app/contexts/AuthContext';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { IntroAnimation } from '@/app/components/common/IntroAnimation';
import { MobileNavDrawer } from '@/app/components/common/MobileNavDrawer';
import { PricingNavMenu } from '@/app/components/common/PricingNavMenu';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { SiteFooter } from '@/app/components/common/SiteFooter';
import { IncentivePreview } from '@/app/components/user/landing/IncentivePreview';
import { LandingSections } from '@/app/components/user/landing/LandingSections';
import { AccountMenu } from '@/app/components/common/AccountMenu';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);

  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh', position: 'relative', overflow: 'hidden' }}>
      <IntroAnimation />

      {/* Header */}
      <Box
        sx={{
          bgcolor: t.pageBg,
          borderBottom: `1px solid ${t.border}`,
          // Matches PageHeader. At py:3 the header's own top padding read as a gap
          // below the promotion banner, since both surfaces are the same black and
          // nothing marks where one ends and the other begins.
          py: 2,
          position: 'sticky',
          // Sits below the promotion banner when one is showing. The banner
          // publishes its measured height, so this stays correct when the
          // text wraps and 0 when there is no banner at all.
          top: 'var(--promo-h, 0px)',
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

          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'grid',
              // Copy leads on every width. On mobile the headline and CTA come
              // first and the preview follows, which is the order the argument
              // needs: claim, then evidence.
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr', lg: '0.95fr 1.05fr' },
              gap: { xs: 6, md: 7, lg: 9 },
              alignItems: 'center',
              py: { xs: 6, md: 8 },
            }}
          >
            <Box>
              {/* The one eyebrow on this page. It names the category for a visitor
                  who has never heard of it, which is a job worth doing once — not
                  a label repeated above every section below. */}
              <Typography
                sx={{
                  color: t.goldText,
                  fontSize: 11.5,
                  fontWeight: 800,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  mb: 2.5,
                }}
              >
                Production incentive intelligence
              </Typography>

              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: '2.5rem', sm: '3rem', md: '3.25rem', lg: '3.75rem' },
                  fontWeight: 700,
                  lineHeight: 1.05,
                  letterSpacing: '-0.035em',
                  color: t.textPrimary,
                  textWrap: 'balance',
                  mb: 3,
                }}
              >
                Where should this film shoot?
              </Typography>

              <Typography
                sx={{
                  color: t.textSecondary,
                  fontSize: { xs: '1.0625rem', md: '1.125rem' },
                  lineHeight: 1.7,
                  // Held to a scannable measure rather than the column width.
                  maxWidth: 545,
                  textWrap: 'pretty',
                  mb: 4,
                }}
              >
                Upload your screenplay and compare your production across{' '}
                <Box component="span" sx={{ color: t.textPrimary, fontWeight: 600 }}>
                  49 tax-incentive programmes
                </Box>
                . See where your project qualifies, what the incentive could be worth,
                and which location gives you the strongest production economics.
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/upload')}
                  startIcon={<CloudUpload />}
                  sx={{ px: 3.5, py: 1.6, fontSize: '1rem' }}
                >
                  Upload screenplay
                </Button>
                {/* Deliberately not a second button. One action is the point. */}
                <Box
                  component="button"
                  type="button"
                  onClick={() => navigate('/sample')}
                  sx={{
                    background: 'none',
                    border: 0,
                    p: 0,
                    font: 'inherit',
                    cursor: 'pointer',
                    color: t.textSecondary,
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 0.5,
                    transition: 'color 160ms cubic-bezier(0.16, 1, 0.3, 1)',
                    '&:hover': { color: t.textPrimary },
                    '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
                  }}
                >
                  See a sample report
                  <Box component="span" aria-hidden>&rarr;</Box>
                </Box>
              </Box>

              <Typography
                sx={{
                  color: t.textFaint,
                  fontSize: 13,
                  mt: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  flexWrap: 'wrap',
                }}
              >
                <LockOutlined sx={{ fontSize: 14 }} aria-hidden />
                Private analysis · One report free · No card required
              </Typography>

              <Typography sx={{ color: t.textFaint, fontSize: 13.5, mt: 2.5 }}>
                Not ready to upload?{' '}
                <Box
                  component="button"
                  type="button"
                  onClick={() => navigate('/what-if')}
                  sx={{
                    background: 'none', border: 0, p: 0, font: 'inherit', cursor: 'pointer',
                    color: t.textSecondary, fontWeight: 600, textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                    '&:hover': { color: t.textPrimary },
                  }}
                >
                  Try the What If Calculator &rarr;
                </Box>
              </Typography>
            </Box>

            <IncentivePreview />
          </Box>
        </Container>
      </Box>

      <LandingSections />

      <SiteFooter />
    </Box>
  );
}
