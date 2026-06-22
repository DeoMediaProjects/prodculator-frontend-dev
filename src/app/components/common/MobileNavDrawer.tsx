import { useState } from 'react';
import {
  Box,
  IconButton,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Button,
} from '@mui/material';
import { Menu as MenuIcon, Close as CloseIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { useScrollLock } from '@/app/hooks/useScrollLock';

interface NavLink {
  label: string;
  path: string;
  /** Only show when the user is authenticated. */
  authOnly?: boolean;
}

const NAV_LINKS: NavLink[] = [
  { label: 'Pricing', path: '/pricing' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' },
  { label: 'B2B Solutions', path: '/b2b', authOnly: true },
];

interface MobileNavDrawerProps {
  /** Colour of the hamburger trigger, so it matches light or dark headers. */
  iconColor?: string;
}

/**
 * Hamburger trigger + slide-out navigation drawer for small screens.
 *
 * The trigger is only visible below the `md` breakpoint (per the "big phone"
 * decision — phones and small tablets get the drawer). Desktop keeps its
 * inline header nav. Drop `<MobileNavDrawer />` into any page header that
 * otherwise hides its nav links on mobile.
 */
export function MobileNavDrawer({ iconColor = '#000000' }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Pin the page behind the drawer (works on iOS, unlike MUI's own lock).
  useScrollLock(open);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const links = NAV_LINKS.filter((l) => !l.authOnly || isAuthenticated);

  return (
    <>
      <IconButton
        aria-label="Open navigation menu"
        onClick={() => setOpen(true)}
        sx={{ display: { xs: 'inline-flex', md: 'none' }, color: iconColor }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        // We lock scroll ourselves via useScrollLock (MUI's lock leaks on iOS).
        disableScrollLock
        slotProps={{ paper: { sx: { width: 280, maxWidth: '85vw', bgcolor: '#0A0A0A', color: '#fff' } } }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton aria-label="Close navigation menu" onClick={() => setOpen(false)} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <List sx={{ pt: 0 }}>
          {links.map((l) => (
            <ListItemButton key={l.path} onClick={() => go(l.path)}>
              <ListItemText primary={l.label} slotProps={{ primary: { fontWeight: 600 } }} />
            </ListItemButton>
          ))}
        </List>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', my: 1 }} />

        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {isAuthenticated ? (
            <Button
              variant="contained"
              fullWidth
              onClick={() => go('/dashboard')}
              sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 600, '&:hover': { bgcolor: '#B8941F' } }}
            >
              Dashboard
            </Button>
          ) : (
            <>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => go('/login')}
                sx={{ borderColor: '#D4AF37', color: '#D4AF37', fontWeight: 600 }}
              >
                Login
              </Button>
              <Button
                variant="contained"
                fullWidth
                onClick={() => go('/signup')}
                sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 600, '&:hover': { bgcolor: '#B8941F' } }}
              >
                Sign Up
              </Button>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}
