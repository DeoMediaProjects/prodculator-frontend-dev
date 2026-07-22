import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import {
  CloudUpload,
  Assignment,
  Instagram,
  Facebook,
  LinkedIn,
  Twitter,
} from '@mui/icons-material';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import footerLogo from '@/assets/prodculator-logo-white.png';
import grantifyMark from '@/assets/grantify-mark-white.png';
import { useAuth } from '@/app/contexts/AuthContext';
import { IntroAnimation } from '@/app/components/common/IntroAnimation';
import { MobileNavDrawer } from '@/app/components/common/MobileNavDrawer';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100dvh', position: 'relative', overflow: 'hidden' }}  >
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
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0) 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <Box 
        sx={{ 
          bgcolor: '#ffffff',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          py: 3,
          position: 'relative',
          zIndex: 10,
        }}
      >
        <Container maxWidth="xl" >
          <Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <img 
                src={exampleLogo} 
                alt="Prodculator" 
                style={{ height: '40px', width: 'auto' }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 1, md: 3 }, alignItems: 'center', flexWrap: 'wrap' }}>
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 3, alignItems: 'center' }}>
                <Button
                  variant="text"
                  onClick={() => navigate('/b2b')}
                  sx={{
                    color: '#000000',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: 'rgba(212, 175, 55, 0.08)',
                    }
                  }}
                >
                  B2B Solutions
                </Button>
                <Button 
                  variant="text"
                  onClick={() => navigate('/pricing')}
                  sx={{ 
                    color: '#000000',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: 'rgba(212, 175, 55, 0.08)',
                    }
                  }}
                >
                  Pricing
                </Button>
                <Button 
                  variant="text"
                  onClick={() => navigate('/faq')}
                  sx={{ 
                    color: '#000000',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: 'rgba(212, 175, 55, 0.08)',
                    }
                  }}
                >
                  FAQ
                </Button>
                <Button
                  variant="text"
                  onClick={() => navigate('/contact')}
                  sx={{
                    color: '#000000',
                    fontWeight: 600,
                    textTransform: 'none',
                    '&:hover': {
                      bgcolor: 'rgba(212, 175, 55, 0.08)',
                    }
                  }}
                >
                  Contact
                </Button>
              </Box>
              <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: { xs: 1, md: 2 }, alignItems: 'center' }}>
              {isAuthenticated ? (
                <>
                  <Button
                    variant="outlined"
                    onClick={() => navigate('/dashboard')}
                    sx={{
                      borderColor: '#D4AF37',
                      color: '#D4AF37',
                      fontWeight: 600,
                      px: { xs: 2, md: 3 },
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#D4AF37',
                        bgcolor: 'rgba(212, 175, 55, 0.08)',
                      }
                    }}
                  >
                    Dashboard
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="outlined"
                    onClick={() => navigate('/login')}
                    sx={{ 
                      borderColor: '#D4AF37',
                      color: '#D4AF37',
                      fontWeight: 400,
                      px: { xs: 2, md: 3 },
                      textTransform: 'none',
                      '&:hover': {
                        borderColor: '#D4AF37',
                        bgcolor: 'rgba(212, 175, 55, 0.08)',
                      }
                    }}
                  >
                    Login
                  </Button>
                  <Button 
                    variant="contained"
                    onClick={() => navigate('/signup')}
                    sx={{ 
                      bgcolor: '#D4AF37',
                      color: '#000000',
                      fontWeight: 400,
                      px: { xs: 2, md: 3 },
                      textTransform: 'none',
                      '&:hover': {
                        bgcolor: '#D4AF37',
                      }
                    }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
              </Box>
              <MobileNavDrawer iconColor="#000000" />
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
          backgroundImage: 'linear-gradient(rgba(0,0,0,0.82), rgba(0,0,0,0.92)), url(/landing-bg.png)',
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
              <Box component="span" sx={{ color: '#D4AF37' }}>Turn your</Box>
              {' '}
              <Box component="span" sx={{ color: '#ffffff' }}>script</Box>
              {' '}
              <Box component="span" sx={{ color: '#D4AF37' }}>into</Box>
              <br />
              <Box component="span" sx={{ color: '#ffffff' }}>Production intelligence</Box>
              <br />
              <Box component="span" sx={{ color: '#D4AF37', fontSize: '1.5rem' }}>with our Scripteligence tool</Box>
            </Typography>

            <Box sx={{ mb: 6 }}>
              <Typography 
                sx={{ 
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  fontWeight: 700,
                  color: '#ffffff',
                  mb: 1,
                }}
              >
                Upload your script.
              </Typography>
              <Typography 
                sx={{ 
                  fontSize: { xs: '1.1rem', md: '1.25rem' },
                  fontWeight: 700,
                  color: '#D4AF37',
                  mb: 3,
                }}
              >
                Discover where it makes the most financial sense to shoot.
              </Typography>
              <Typography 
                sx={{ 
                  fontSize: { xs: '0.95rem', md: '1rem' },
                  color: '#D4AF37',
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
                sx={{ 
                  bgcolor: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  textTransform: 'none',
                  borderRadius: '4px',
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  }
                }}
              >
                Upload Script
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/sample')}
                startIcon={<Assignment />}
                sx={{
                  bgcolor: '#ffffff',
                  color: '#000000',
                  fontWeight: 600,
                  px: 4,
                  py: 1.5,
                  fontSize: { xs: '0.9rem', md: '1rem' },
                  textTransform: 'none',
                  borderRadius: '4px',
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                  }
                }}
              >
                See Sample Report
              </Button>
              {!isAuthenticated && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/what-if')}
                  sx={{
                    borderColor: '#D4AF37',
                    color: '#D4AF37',
                    fontWeight: 600,
                    px: 4,
                    py: 1.5,
                    fontSize: { xs: '0.9rem', md: '1rem' },
                    textTransform: 'none',
                    borderRadius: '4px',
                    animation: 'ctaGlow 2s ease-in-out infinite',
                    '@keyframes ctaGlow': {
                      '0%, 100%': { boxShadow: '0 0 6px 1px rgba(212, 175, 55, 0.2)', borderColor: '#D4AF37' },
                      '50%': { boxShadow: '0 0 22px 8px rgba(212, 175, 55, 0.65)', borderColor: '#F5D76E' },
                    },
                    '&:hover': {
                      borderColor: '#F5D76E',
                      bgcolor: 'rgba(212, 175, 55, 0.1)',
                      animation: 'none',
                      boxShadow: '0 0 26px 10px rgba(212, 175, 55, 0.7)',
                    }
                  }}
                >
                  Try What If Calculator
                </Button>
              )}
            </Box>
      
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          bgcolor: '#0a0a0a',
          pt: 6,
          pb: 3,
        }}
      >
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1.6fr 1fr 1fr 1fr 1.3fr' },
              gap: 5,
              pb: 4,
            }}
          >
            {/* Brand */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <img src={footerLogo} alt="Prodculator" style={{ height: '30px', width: 'auto', display: 'block', alignSelf: 'flex-start' }} />
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, maxWidth: 260 }}>
                AI-powered location strategy, tax incentive estimates and production insight, generated from your script.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.14em' }}>
                  IN PARTNERSHIP WITH
                </Typography>
                <Box
                  component="img"
                  src={grantifyMark}
                  alt="Grantify"
                  sx={{ height: '22px', width: 'auto', display: 'block', alignSelf: 'flex-start' }}
                />
              </Box>
            </Box>

            {/* Product */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.1em', mb: 2 }}>
                PRODUCT
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {[
                  { label: 'Upload Script', to: '/upload' },
                  { label: 'Sample Report', to: '/sample' },
                  { label: 'What If Calculator', to: '/what-if' },
                  { label: 'B2B Solutions', to: '/b2b' },
                ].map((l) => (
                  <Box
                    key={l.to}
                    onClick={() => navigate(l.to)}
                    sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', width: 'fit-content', '&:hover': { color: '#D4AF37' } }}
                  >
                    {l.label}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Company */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.1em', mb: 2 }}>
                COMPANY
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {[
                  { label: 'Pricing', to: '/pricing' },
                  { label: 'FAQ', to: '/faq' },
                  { label: 'Contact', to: '/contact' },
                ].map((l) => (
                  <Box
                    key={l.to}
                    onClick={() => navigate(l.to)}
                    sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', width: 'fit-content', '&:hover': { color: '#D4AF37' } }}
                  >
                    {l.label}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Legal */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.1em', mb: 2 }}>
                LEGAL
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                {[
                  { label: 'Terms of Service', to: '/terms' },
                  { label: 'Privacy Policy', to: '/privacy' },
                  { label: 'Acceptable Use', to: '/acceptable-use' },
                ].map((l) => (
                  <Box
                    key={l.to}
                    onClick={() => navigate(l.to)}
                    sx={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', cursor: 'pointer', width: 'fit-content', '&:hover': { color: '#D4AF37' } }}
                  >
                    {l.label}
                  </Box>
                ))}
              </Box>
            </Box>

            {/* Get in touch */}
            <Box>
              <Typography sx={{ fontSize: 12, fontWeight: 800, color: '#D4AF37', letterSpacing: '0.1em', mb: 2 }}>
                GET IN TOUCH
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', mb: 1 }}>
                <Box component="span" sx={{ fontWeight: 700, color: '#ffffff' }}>General: </Box>
                <Box
                  component="a"
                  href="mailto:contact@prodculator.com"
                  sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', '&:hover': { color: '#D4AF37' } }}
                >
                  contact@prodculator.com
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                <Box component="span" sx={{ fontWeight: 700, color: '#ffffff' }}>Partnerships: </Box>
                <Box
                  component="a"
                  href="mailto:partners@prodculator.com"
                  sx={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', '&:hover': { color: '#D4AF37' } }}
                >
                  partners@prodculator.com
                </Box>
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.25 }}>
                {[
                  { href: 'https://www.instagram.com/prodculator/', icon: <Instagram sx={{ fontSize: 22 }} />, label: 'Instagram' },
                  { href: 'https://www.facebook.com/prodculator', icon: <Facebook sx={{ fontSize: 22 }} />, label: 'Facebook' },
                  { href: 'https://www.linkedin.com/company/prodculator/', icon: <LinkedIn sx={{ fontSize: 22 }} />, label: 'LinkedIn' },
                  { href: 'https://x.com/prodculator', icon: <Twitter sx={{ fontSize: 22 }} />, label: 'X' },
                ].map(({ href, icon, label }) => (
                  <Box
                    key={label}
                    component="a"
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'rgba(255,255,255,0.7)',
                      '&:hover': { borderColor: '#D4AF37', color: '#D4AF37' },
                      transition: 'color 0.2s, border-color 0.2s',
                    }}
                  >
                    {icon}
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* Sub-footer row */}
          <Box
            sx={{
              borderTop: '1px solid rgba(255,255,255,0.12)',
              pt: 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography sx={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', textAlign: { xs: 'center', sm: 'left' } }}>
              Springhead Road, Northfleet, Kent, United Kingdom, DA11 8HN
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: { xs: 'center', sm: 'right' } }}>
              © 2026 PRODCULATOR. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
