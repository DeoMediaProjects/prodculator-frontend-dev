import { Box, Button, IconButton, Typography, Avatar, Tooltip } from '@mui/material';
import {
  DescriptionOutlined, CompareArrowsOutlined, CalculateOutlined, TimelineOutlined,
  PersonOutlineOutlined, LogoutOutlined,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import brandLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

export const SIDEBAR_W = 248;

export const NAV = [
  { label: 'Reports', to: '/dashboard', icon: DescriptionOutlined, exact: true },
  { label: 'Territories', to: '/dashboard/territories', icon: CompareArrowsOutlined },
  { label: 'What If', to: '/dashboard/what-if', icon: CalculateOutlined },
  { label: 'Timeline', to: '/dashboard/timeline', icon: TimelineOutlined },
  { label: 'Account', to: '/dashboard/account', icon: PersonOutlineOutlined },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { user, userLogout } = useAuth();

  const email = user?.email || '';
  const displayName = email ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Guest';
  const initials = displayName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'U';
  const planLabel = (user?.plan || 'free').toUpperCase();

  const isActive = (item: (typeof NAV)[number]) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const go = (to: string) => { navigate(to); onNavigate?.(); };
  const handleLogout = () => { userLogout(); navigate('/'); };

  return (
    <Box sx={{ width: SIDEBAR_W, height: '100%', bgcolor: t.sidebarBg, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column', px: 2.5, py: 3 }}>
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, px: 0.5, height: 46 }}>
        <Box component="img" src={brandLogo} alt="Prodculator" sx={{ width: '92%', maxWidth: 190, height: 'auto', display: 'block', filter: mode === 'dark' ? 'invert(1)' : 'none' }} />
      </Box>

      {/* Nav */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, flex: 1 }}>
        {NAV.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Box
              key={item.to}
              onClick={() => go(item.to)}
              sx={{
                display: 'flex', alignItems: 'center', gap: 1.75, px: 1.75, py: 1.6, borderRadius: '10px', cursor: 'pointer',
                position: 'relative', transition: 'background .15s',
                color: active ? t.gold : t.textSecondary,
                bgcolor: active ? t.goldDim : 'transparent',
                '&:hover': { bgcolor: active ? t.goldDim : t.borderSoft, color: active ? t.gold : t.textPrimary },
                '&::before': active ? { content: '""', position: 'absolute', left: -20, top: 10, bottom: 10, width: 3, borderRadius: '3px', bgcolor: t.gold } : {},
              }}
            >
              <Icon sx={{ fontSize: 23 }} />
              <Typography sx={{ fontSize: 16, fontWeight: active ? 700 : 500, color: 'inherit' }}>{item.label}</Typography>
            </Box>
          );
        })}
      </Box>

      {/* User card */}
      <Box sx={{ borderTop: `1px solid ${t.border}`, pt: 2, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
          <Avatar sx={{ width: 38, height: 38, bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff', fontWeight: 700, fontSize: 14 }}>{initials}</Avatar>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</Typography>
            <Typography sx={{ fontSize: 11.5, color: t.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={() => go('/pricing')} variant="contained" size="small" sx={{ flex: 1, py: 0.75 }}>
            {planLabel === 'FREE' ? 'Upgrade' : 'Manage plan'}
          </Button>
          <Tooltip title="Sign out">
            <IconButton onClick={handleLogout} sx={{ border: `1px solid ${t.border}`, borderRadius: '10px', color: t.textSecondary }}>
              <LogoutOutlined sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
}
