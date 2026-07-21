import { useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HeaderActionsContext } from './headerActions';
import { Sidebar, SIDEBAR_W } from './Sidebar';
import {
  Box, Drawer, IconButton, Button, Typography, Badge, useMediaQuery, useTheme,
} from '@mui/material';
import {
  LightModeOutlined, DarkModeOutlined, Add, NotificationsNoneOutlined, Menu as MenuIcon,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

// eyebrow + title + optional description per route. The description lives in the
// top bar so pages don't repeat a title/subtitle in their content.
function pageMeta(path: string): { eyebrow: string; title: string; description?: string } {
  if (path.startsWith('/dashboard/territories')) return { eyebrow: 'DASHBOARD', title: 'Territory Comparison', description: 'Compare up to 4 territories side by side' };
  if (path.startsWith('/dashboard/what-if')) return { eyebrow: 'DASHBOARD', title: 'What If Calculator', description: 'Compare financial returns across territories at your budget' };
  if (path.startsWith('/dashboard/timeline')) return { eyebrow: 'DASHBOARD', title: 'Production Timeline', description: 'Track your progress from analysis to production' };
  if (path.startsWith('/dashboard/account')) return { eyebrow: 'DASHBOARD', title: 'Account' };
  return { eyebrow: 'WELCOME BACK', title: 'Dashboard' };
}

export function B2CLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerActions, setHeaderActions] = useState<ReactNode>(null);

  const meta = pageMeta(location.pathname);
  // The Timeline page has its own "Add Milestone" action; hide the global
  // "New Analysis" button there so we never show two primary buttons side by side.
  const hideNewAnalysis = location.pathname.startsWith('/dashboard/timeline');

  return (
    <HeaderActionsContext.Provider value={{ setActions: setHeaderActions }}>
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: t.pageBg }}>
      {/* Sidebar: permanent on desktop, drawer on mobile */}
      {isDesktop ? (
        <Box sx={{ width: SIDEBAR_W, flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}><Sidebar /></Box>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { border: 'none' } }}>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      {/* Main column */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: { xs: 2, md: 5 }, py: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
            {!isDesktop && (
              <IconButton onClick={() => setMobileOpen(true)} sx={{ color: t.textPrimary }}><MenuIcon /></IconButton>
            )}
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: t.textSecondary }}>{meta.eyebrow}</Typography>
              <Typography sx={{ fontSize: { xs: 24, md: 32 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1 }}>{meta.title}</Typography>
              {meta.description && (
                <Typography sx={{ fontSize: 13.5, color: t.textSecondary, mt: 0.5 }}>{meta.description}</Typography>
              )}
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {/* Theme toggle */}
            <Box sx={{ display: 'flex', border: `1px solid ${t.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              <IconButton onClick={() => mode !== 'light' && toggle()} sx={{ borderRadius: 0, bgcolor: mode === 'light' ? t.gold : 'transparent', color: mode === 'light' ? '#1C1A16' : t.textSecondary, '&:hover': { bgcolor: mode === 'light' ? t.gold : t.goldDim } }}>
                <LightModeOutlined sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton onClick={() => mode !== 'dark' && toggle()} sx={{ borderRadius: 0, bgcolor: mode === 'dark' ? t.gold : 'transparent', color: mode === 'dark' ? '#1C1A16' : t.textSecondary, '&:hover': { bgcolor: mode === 'dark' ? t.gold : t.goldDim } }}>
                <DarkModeOutlined sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
            {/* Page-specific action buttons (Export CSV, Add Milestone, …) render here */}
            {headerActions}
            {!hideNewAnalysis && (
              <>
                <Button onClick={() => navigate('/analysis/new')} variant="contained" startIcon={<Add />} sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}>
                  New Analysis
                </Button>
                <IconButton onClick={() => navigate('/analysis/new')} sx={{ display: { xs: 'inline-flex', sm: 'none' }, borderRadius: '10px', bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff' }}><Add /></IconButton>
              </>
            )}
            <Badge badgeContent={0} color="primary" overlap="rectangular" sx={{ '& .MuiBadge-badge': { top: 5, right: 5 } }}>
              <IconButton sx={{ border: `1px solid ${t.border}`, borderRadius: '10px', color: t.textSecondary }}><NotificationsNoneOutlined sx={{ fontSize: 20 }} /></IconButton>
            </Badge>
          </Box>
        </Box>

        {/* Routed content */}
        <Box sx={{ flex: 1, px: { xs: 2, md: 5 }, pb: 6 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
    </HeaderActionsContext.Provider>
  );
}
