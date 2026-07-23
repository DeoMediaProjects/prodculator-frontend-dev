import { Box, Container, Typography } from '@mui/material';
import { useNavigate } from 'react-router';
import { Instagram, Facebook, LinkedIn, Twitter } from '@mui/icons-material';
import footerLogo from '@/assets/prodculator-logo-white.png';
import grantifyMark from '@/assets/grantify-mark-white.png';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

const PRODUCT_LINKS = [
  { label: 'Upload Script', to: '/upload' },
  { label: 'Sample Report', to: '/sample' },
  { label: 'What If Calculator', to: '/what-if' },
  { label: 'B2B Solutions', to: '/b2b' },
];

const COMPANY_LINKS = [
  { label: 'Pricing', to: '/pricing' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact', to: '/contact' },
];

const LEGAL_LINKS = [
  { label: 'Terms of Service', to: '/terms' },
  { label: 'Privacy Policy', to: '/privacy' },
  { label: 'Acceptable Use', to: '/acceptable-use' },
];

const SOCIAL_LINKS = [
  { href: 'https://www.instagram.com/prodculator/', icon: <Instagram sx={{ fontSize: 22 }} />, label: 'Instagram' },
  { href: 'https://www.facebook.com/prodculator', icon: <Facebook sx={{ fontSize: 22 }} />, label: 'Facebook' },
  { href: 'https://www.linkedin.com/company/prodculator/', icon: <LinkedIn sx={{ fontSize: 22 }} />, label: 'LinkedIn' },
  { href: 'https://x.com/prodculator', icon: <Twitter sx={{ fontSize: 22 }} />, label: 'X' },
];

/** Site-wide footer, theme-aware. Shared between the landing page and any
 * other top-level page that should end in the same brand/legal footer. */
export function SiteFooter() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const linkSx = { fontSize: 13.5, color: t.textSecondary, cursor: 'pointer', width: 'fit-content', '&:hover': { color: t.gold } };
  const headingSx = { fontSize: 12, fontWeight: 800, color: t.gold, letterSpacing: '0.1em', mb: 2 };

  return (
    <Box sx={{ position: 'relative', zIndex: 1, bgcolor: t.cardBgAlt, pt: 6, pb: 3 }}>
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
            <img
              src={footerLogo}
              alt="Prodculator"
              style={{ height: '30px', width: 'auto', display: 'block', alignSelf: 'flex-start', filter: mode === 'light' ? 'invert(1)' : 'none' }}
            />
            <Typography sx={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.7, maxWidth: 260 }}>
              AI-powered location strategy, tax incentive estimates and production insight, generated from your script.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mt: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: t.gold, letterSpacing: '0.14em' }}>
                IN PARTNERSHIP WITH
              </Typography>
              <Box
                component="img"
                src={grantifyMark}
                alt="Grantify"
                sx={{ height: '22px', width: 'auto', display: 'block', alignSelf: 'flex-start', filter: mode === 'light' ? 'invert(1)' : 'none' }}
              />
            </Box>
          </Box>

          {/* Product */}
          <Box>
            <Typography sx={headingSx}>PRODUCT</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {PRODUCT_LINKS.map((l) => (
                <Box key={l.to} onClick={() => navigate(l.to)} sx={linkSx}>{l.label}</Box>
              ))}
            </Box>
          </Box>

          {/* Company */}
          <Box>
            <Typography sx={headingSx}>COMPANY</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {COMPANY_LINKS.map((l) => (
                <Box key={l.to} onClick={() => navigate(l.to)} sx={linkSx}>{l.label}</Box>
              ))}
            </Box>
          </Box>

          {/* Legal */}
          <Box>
            <Typography sx={headingSx}>LEGAL</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {LEGAL_LINKS.map((l) => (
                <Box key={l.to} onClick={() => navigate(l.to)} sx={linkSx}>{l.label}</Box>
              ))}
            </Box>
          </Box>

          {/* Get in touch */}
          <Box>
            <Typography sx={headingSx}>GET IN TOUCH</Typography>
            <Typography sx={{ fontSize: 13, color: t.textSecondary, mb: 1 }}>
              <Box component="span" sx={{ fontWeight: 700, color: t.textPrimary }}>General: </Box>
              <Box
                component="a"
                href="mailto:contact@prodculator.com"
                sx={{ color: t.textSecondary, textDecoration: 'none', '&:hover': { color: t.gold } }}
              >
                contact@prodculator.com
              </Box>
            </Typography>
            <Typography sx={{ fontSize: 13, color: t.textSecondary, mb: 2 }}>
              <Box component="span" sx={{ fontWeight: 700, color: t.textPrimary }}>Partnerships: </Box>
              <Box
                component="a"
                href="mailto:partners@prodculator.com"
                sx={{ color: t.textSecondary, textDecoration: 'none', '&:hover': { color: t.gold } }}
              >
                partners@prodculator.com
              </Box>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1.25 }}>
              {SOCIAL_LINKS.map(({ href, icon, label }) => (
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
                    border: `1px solid ${t.border}`,
                    color: t.textSecondary,
                    '&:hover': { borderColor: t.gold, color: t.gold },
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
            borderTop: `1px solid ${t.border}`,
            pt: 3,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Typography sx={{ fontSize: 12.5, color: t.textFaint, textAlign: { xs: 'center', sm: 'left' } }}>
            Springhead Road, Northfleet, Kent, United Kingdom, DA11 8HN
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.textFaint, textAlign: { xs: 'center', sm: 'right' } }}>
            © 2026 PRODCULATOR. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}
