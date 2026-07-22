import { useState, useEffect } from 'react';
import { Box, IconButton, Typography, Avatar, Tooltip, Menu, MenuItem, ListItemIcon } from '@mui/material';
import {
  DescriptionOutlined, CompareArrowsOutlined, CalculateOutlined, TimelineOutlined,
  PersonOutlineOutlined, LogoutOutlined, ChevronLeft, ChevronRight, HomeOutlined,
  ExpandLess,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import brandLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

export const SIDEBAR_W = 248;
export const SIDEBAR_COLLAPSED_W = 78;

// Shared with AccountPage so the sidebar reflects the saved full name instead
// of always deriving it from the email address.
export const PROFILE_KEY = 'prodculator-profile';
export const PROFILE_UPDATED_EVENT = 'prodculator-profile-updated';

function readSavedName(): string {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    if (s) {
      const p = JSON.parse(s);
      if (p.fullName) return String(p.fullName).trim();
    }
  } catch { /* */ }
  return '';
}

// Collapsed state is shared (via localStorage) so it persists across navigation
// and stays consistent between the dashboard shell and the wizard.
const COLLAPSE_KEY = 'prodculator-sidebar-collapsed';
export function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; }
  });
  const toggle = () => setCollapsed((c) => {
    const next = !c;
    try { localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0'); } catch { /* */ }
    return next;
  });
  return { collapsed, toggle };
}

export const NAV = [
  { label: 'Reports', to: '/dashboard', icon: DescriptionOutlined, exact: true },
  { label: 'Territories', to: '/dashboard/territories', icon: CompareArrowsOutlined },
  { label: 'What If', to: '/dashboard/what-if', icon: CalculateOutlined },
  { label: 'Timeline', to: '/dashboard/timeline', icon: TimelineOutlined },
  { label: 'Account', to: '/dashboard/account', icon: PersonOutlineOutlined },
];

export function Sidebar({
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { user, userLogout } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [savedName, setSavedName] = useState(readSavedName);

  useEffect(() => {
    const sync = () => setSavedName(readSavedName());
    window.addEventListener(PROFILE_UPDATED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const email = user?.email || '';
  const derivedName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Guest';
  const displayName = savedName || derivedName;
  const initials = displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'U';

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const go = (to: string) => { navigate(to); onNavigate?.(); };
  const handleLogout = () => { userLogout(); navigate('/'); };

  return (
    <Box sx={{ width: '100%', height: '100%', bgcolor: t.sidebarBg, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', px: collapsed ? 1.25 : 2.5, py: 3 }}>
      {/* Logo + collapse control */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', mb: 4, px: collapsed ? 0 : 0.5, height: 46 }}>
        {!collapsed && (
          <Box component="img" src={brandLogo} alt="Prodculator" sx={{ width: '78%', maxWidth: 170, height: 'auto', display: 'block', filter: mode === 'dark' ? 'invert(1)' : 'none' }} />
        )}
        {onToggleCollapse && (
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
            <IconButton onClick={onToggleCollapse} size="small" sx={{ color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: '9px', '&:hover': { color: t.gold, borderColor: t.gold } }}>
              {collapsed ? <ChevronRight sx={{ fontSize: 20 }} /> : <ChevronLeft sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Nav */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
        {NAV.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          const node = (
            <Box
              key={item.to}
              onClick={() => go(item.to)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.75,
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 0 : 1.75, py: 1.6, borderRadius: '10px', cursor: 'pointer',
                position: 'relative', transition: 'background .15s',
                color: active ? t.gold : t.textSecondary,
                bgcolor: active ? t.goldDim : 'transparent',
                '&:hover': { bgcolor: active ? t.goldDim : t.borderSoft, color: active ? t.gold : t.textPrimary },
                '&::before': active && !collapsed ? { content: '""', position: 'absolute', left: -20, top: 10, bottom: 10, width: 3, borderRadius: '3px', bgcolor: t.gold } : {},
              }}
            >
              <Icon sx={{ fontSize: 23 }} />
              {!collapsed && <Typography sx={{ fontSize: 16, fontWeight: active ? 700 : 500, color: 'inherit' }}>{item.label}</Typography>}
            </Box>
          );
          return collapsed ? (
            <Tooltip key={item.to} title={item.label} placement="right">{node}</Tooltip>
          ) : node;
        })}
      </Box>

      {/* User menu — click the profile to reveal plan + sign-out actions */}
      <Box sx={{ borderTop: `1px solid ${t.border}`, pt: 2, mt: 2 }}>
        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: 'flex', alignItems: 'center', gap: 1.25, cursor: 'pointer',
            justifyContent: collapsed ? 'center' : 'flex-start',
            p: collapsed ? 0.5 : 1, borderRadius: '10px',
            bgcolor: anchorEl ? t.borderSoft : 'transparent',
            '&:hover': { bgcolor: t.borderSoft },
          }}
        >
          <Avatar sx={{ width: 38, height: 38, bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff', fontWeight: 700, fontSize: 14 }}>{initials}</Avatar>
          {!collapsed && (
            <>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</Typography>
                <Typography sx={{ fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</Typography>
              </Box>
              <ExpandLess sx={{ fontSize: 20, color: t.textSecondary, transform: anchorEl ? 'none' : 'rotate(180deg)', transition: 'transform .15s' }} />
            </>
          )}
        </Box>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          anchorOrigin={{ vertical: 'top', horizontal: collapsed ? 'right' : 'center' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          slotProps={{ paper: { sx: { bgcolor: t.cardBg, border: `1px solid ${t.border}`, minWidth: 208, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' } } }}
        >
          <MenuItem onClick={() => { setAnchorEl(null); go('/'); }} sx={{ color: t.textPrimary, py: 1.1 }}>
            <ListItemIcon sx={{ color: t.textSecondary, minWidth: 34 }}><HomeOutlined sx={{ fontSize: 20 }} /></ListItemIcon>
            Back to main site
          </MenuItem>
          <MenuItem onClick={() => { setAnchorEl(null); handleLogout(); }} sx={{ color: t.textPrimary, py: 1.1 }}>
            <ListItemIcon sx={{ color: t.textSecondary, minWidth: 34 }}><LogoutOutlined sx={{ fontSize: 20 }} /></ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
