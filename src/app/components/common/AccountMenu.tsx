import { useState } from 'react';
import { Avatar, Box, IconButton, ListItemIcon, Menu, MenuItem } from '@mui/material';
import { DashboardOutlined, LogoutOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { useAuth } from '@/app/contexts/AuthContext';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useSavedProfile } from '@/app/components/user/b2c/Sidebar';

/**
 * Avatar trigger + dropdown (Dashboard / Sign out) for public-page headers
 * when the visitor is logged in — replaces a bare "Dashboard" button so the
 * header still reads as "this is you" rather than just a nav link.
 */
export function AccountMenu() {
  const navigate = useNavigate();
  const { userLogout } = useAuth();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { displayName, avatar, initials } = useSavedProfile();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleLogout = () => {
    setAnchorEl(null);
    userLogout();
    navigate('/');
  };

  return (
    <Box>
      <IconButton
        onClick={(e) => setAnchorEl(e.currentTarget)}
        aria-label={`Account menu for ${displayName}`}
        sx={{ p: 0.25, border: `1px solid ${t.border}`, '&:hover': { borderColor: t.gold } }}
      >
        <Avatar src={avatar || undefined} sx={{ width: 32, height: 32, bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff', fontWeight: 700, fontSize: 13 }}>
          {!avatar && initials}
        </Avatar>
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        transitionDuration={{ enter: 120, exit: 90 }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        slotProps={{ paper: { sx: { mt: 1, minWidth: 190, bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 2 } } }}
      >
        <MenuItem onClick={() => { setAnchorEl(null); navigate('/dashboard'); }} sx={{ color: t.textPrimary, py: 1.1 }}>
          <ListItemIcon sx={{ color: t.textSecondary, minWidth: 34 }}><DashboardOutlined sx={{ fontSize: 20 }} /></ListItemIcon>
          Dashboard
        </MenuItem>
        <MenuItem onClick={handleLogout} sx={{ color: t.textPrimary, py: 1.1 }}>
          <ListItemIcon sx={{ color: t.textSecondary, minWidth: 34 }}><LogoutOutlined sx={{ fontSize: 20 }} /></ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </Box>
  );
}
