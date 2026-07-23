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
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

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
];

/**
 * Hamburger trigger + slide-out navigation drawer for small screens.
 *
 * The trigger is only visible below the `md` breakpoint (per the "big phone"
 * decision — phones and small tablets get the drawer). Desktop keeps its
 * inline header nav. Drop `<MobileNavDrawer />` into any page header that
 * otherwise hides its nav links on mobile. Fully theme-aware — matches
 * whichever light/dark mode the page is currently in.
 */
export function MobileNavDrawer() {
  const [open, setOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  useScrollLock(locked);

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
        sx={{ display: { xs: 'inline-flex', md: 'none' }, color: t.textPrimary }}
      >
        <MenuIcon />
      </IconButton>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        // We lock scroll ourselves via useScrollLock (MUI's lock leaks on iOS).
        disableScrollLock
        slotProps={{
          paper: { sx: { width: 280, maxWidth: '85vw', bgcolor: t.cardBg, color: t.textPrimary } },
          // Lock after the open slide ends, release after the close slide ends,
          // so the reflow never competes with the animation.
          transition: {
            onEntered: () => setLocked(true),
            onExited: () => setLocked(false),
          },
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton aria-label="Close navigation menu" onClick={() => setOpen(false)} sx={{ color: t.textPrimary }}>
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

        <Divider sx={{ borderColor: t.border, my: 1 }} />

        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {isAuthenticated ? (
            <Button variant="contained" fullWidth onClick={() => go('/dashboard')}>
              Dashboard
            </Button>
          ) : (
            <>
              <Button variant="outlined" fullWidth onClick={() => go('/login')}>
                Login
              </Button>
              <Button variant="contained" fullWidth onClick={() => go('/signup')}>
                Sign Up
              </Button>
            </>
          )}
        </Box>
      </Drawer>
    </>
  );
}
