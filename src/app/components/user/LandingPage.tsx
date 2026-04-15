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
import grantifyBanner from '@/assets/524910a57dfd11f1e00b5b105577b194b5ba8e33.png';
import { useAuth } from '@/app/contexts/AuthContext';

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, userLogout } = useAuth();

  const handleLogout = async () => {
    await userLogout();
    // page stays on '/', auth state clears
  };

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}  >
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
              <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 3, alignItems: 'center' }}>
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
              </Box>
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
                  <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#000000',
                        fontWeight: 400,
                      }}
                    >
                      Plan: <Box component="span" sx={{ fontWeight: 600 }}>Free</Box>
                    </Typography>
                  </Box>
                  <Button
                    variant="contained"
                    onClick={() => navigate('/pricing')}
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
                    Upgrade
                  </Button>
                  <Button
                    onClick={handleLogout}
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
                    Logout
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
                Admin 
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero Section */}
      <Box 
        sx={{ 
          position: 'relative',
          zIndex: 1,
          minHeight: 'calc(100vh - 80px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          py: 8,
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
                Prodculator analyses your screenplay to generate location recommendations, incentive estimates, and production insights — all delivered in one clear report.
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
                  Try What-If Calculator
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
          bgcolor: '#c8a327ff',
          py: 3,
          mt: 1,
        }}
      >
        <Container maxWidth="xl">
          {/* Main footer row */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'center', md: 'flex-start' },
              gap: 4,
              mb: 2,
            }}
          >
            {/* Logo + Partnership */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: { xs: 'center', md: 'flex-start' } }}>
              <img
                src={exampleLogo}
                alt="Prodculator"
                style={{ height: '40px', width: 'auto',  }}
              />
              <Box
                component="img"
                src={grantifyBanner}
                alt="In partnership with Grantify"
                sx={{ height: '60px', width: { xs: '200px', sm: '250px' }, mt: { xs: 2, md: '90px' } }}
              />
            </Box>

            {/* Contact & Social */}
            <Box sx={{ textAlign: { xs: 'center', md: 'right' } }}>
              <Typography sx={{ fontSize: 13, fontWeight: 800, color: '#000000', mb: 1.5, letterSpacing: '0.08em' }}>
                GET IN TOUCH
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#000000', mb: 0.5 }}>
                <Box component="span" sx={{ fontWeight: 700 }}>General:</Box>{' '}
                <Box
                  component="a"
                  href="mailto:contact@prodculator.com"
                  sx={{
                    color: '#000000',
                    fontWeight: 700,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  contact@prodculator.com
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#000000', mb: 1.5 }}>
                <Box component="span" sx={{ fontWeight: 700 }}>Partnerships:</Box>{' '}
                <Box
                  component="a"
                  href="mailto:partners@prodculator.com"
                  sx={{
                    color: '#000000',
                    fontWeight: 700,
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' },
                  }}
                >
                  partners@prodculator.com
                </Box>
              </Typography>
              <Typography sx={{ fontSize: 13, color: '#000000', lineHeight: 1.7 }}>
                Springhead Road<br />
                Northfleet, Kent<br />
                United Kingdom, DA11 8HN
              </Typography>

              {/* Social Media Icons */}
              <Box sx={{ display: 'flex', gap: 1.5, justifyContent: { xs: 'center', md: 'flex-end' }, mt: 2 }}>
                {[
                  { href: 'https://www.instagram.com/prodculator/', icon: <Instagram sx={{ fontSize: 28, color: '#000000' }} />, label: 'Instagram' },
                  { href: 'https://www.facebook.com/prodculator', icon: <Facebook sx={{ fontSize: 28, color: '#000000' }} />, label: 'Facebook' },
                  { href: 'https://www.linkedin.com/company/prodculator/', icon: <LinkedIn sx={{ fontSize: 28, color: '#000000' }} />, label: 'LinkedIn' },
                  { href: 'https://x.com/prodculator', icon: <Twitter sx={{ fontSize: 28, color: '#000000' }} />, label: 'X' },
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
                      '&:hover': { opacity: 0.6 },
                      transition: 'opacity 0.2s',
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
              borderTop: '1px solid rgba(0,0,0,0.15)',
              pt: 3,
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            {/* Terms */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, alignItems: { xs: 'center', sm: 'flex-start' } }}>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Box
                  component="a"
                  href="/terms"
                  sx={{ fontSize: 13, color: '#000000', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Terms of Service
                </Box>
                <Box
                  component="a"
                  href="/privacy"
                  sx={{ fontSize: 13, color: '#000000', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  Privacy Policy
                </Box>
              </Box>
            </Box>

            {/* Copyright */}
            <Typography sx={{ fontSize: 13, color: '#000000', textAlign: { xs: 'center', sm: 'right' } }}>
              © 2026 PRODCULATOR. All rights reserved.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}