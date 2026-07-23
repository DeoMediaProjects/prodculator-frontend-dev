import { useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HeaderActionsContext } from './headerActions';
import { Sidebar, SIDEBAR_W, SIDEBAR_COLLAPSED_W, useSidebarCollapsed } from './Sidebar';
import {
  Box, Drawer, IconButton, Button, Typography, useMediaQuery, useTheme,
} from '@mui/material';
import {
  LightModeOutlined, DarkModeOutlined, Add, Menu as MenuIcon,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { NotificationBell } from './NotificationBell';
import { SegmentedToggle } from './SegmentedToggle';

// eyebrow + title + optional description per route. The description lives in the
// top bar so pages don't repeat a title/subtitle in their content.
function pageMeta(path: string): { eyebrow: string; title: string; description?: string } {
  if (path.startsWith('/dashboard/territories')) return { eyebrow: 'DASHBOARD', title: 'Territory Comparison', description: 'Compare up to 4 territories side by side' };
  if (path.startsWith('/dashboard/what-if')) return { eyebrow: 'DASHBOARD', title: 'What If Calculator', description: 'Compare financial returns across territories at your budget' };
  if (path.startsWith('/dashboard/timeline')) return { eyebrow: 'DASHBOARD', title: 'Production Timeline', description: 'Track your progress from analysis to production' };
  if (path.startsWith('/dashboard/account')) return { eyebrow: 'DASHBOARD', title: 'Account' };
  if (path.startsWith('/dashboard/reports')) return { eyebrow: 'DASHBOARD', title: 'All Reports', description: 'Every report you have generated' };
  // Index route — matches the "Reports" item in the sidebar.
  return { eyebrow: 'WELCOME BACK', title: 'Reports' };
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
  const { collapsed, toggle: toggleCollapsed } = useSidebarCollapsed();

  const meta = pageMeta(location.pathname);
  // The Timeline page has its own "Add Milestone" action; hide the global
  // "New Analysis" button there so we never show two primary buttons side by side.
  const hideNewAnalysis = location.pathname.startsWith('/dashboard/timeline');

  return (
    <HeaderActionsContext.Provider value={{ setActions: setHeaderActions }}>
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: t.pageBg }}>
      {/* Sidebar: permanent on desktop, drawer on mobile */}
      {isDesktop ? (
        <Box sx={{ width: collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_W, flexShrink: 0, position: 'sticky', top: 0, height: '100vh', transition: 'width .22s ease', zIndex: (theme) => theme.zIndex.appBar }}>
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </Box>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} PaperProps={{ sx: { border: 'none' } }}>
          <Sidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      {/* Main column */}
      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: t.pageBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: { xs: 2, md: 5 },
            py: 3,
          }}
        >
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
            <SegmentedToggle
              radius={12}
              value={mode}
              onChange={(v) => v !== mode && toggle()}
              options={[
                { value: 'light', icon: <LightModeOutlined sx={{ fontSize: 18 }} /> },
                { value: 'dark', icon: <DarkModeOutlined sx={{ fontSize: 18 }} /> },
              ]}
            />
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
            <NotificationBell />
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
