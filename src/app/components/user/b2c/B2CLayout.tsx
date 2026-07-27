import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { HeaderActionsContext } from './headerActions';
import { Sidebar, SIDEBAR_W, SIDEBAR_COLLAPSED_W, useSidebarCollapsed } from './Sidebar';
import {
  Box, Drawer, IconButton, Button, Typography, Tooltip, useMediaQuery, useTheme,
} from '@mui/material';
import {
  LightModeOutlined, DarkModeOutlined, Add, Menu as MenuIcon, HelpOutlineOutlined,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { NotificationBell } from './NotificationBell';
import { SegmentedToggle } from './SegmentedToggle';
import { OnboardingTour } from './OnboardingTour';
import { usePrefersReducedMotion } from './tourStyles';

// Per-browser marker that the dashboard has been opened before, so a returning
// user gets "Welcome back" and a genuine first-timer just gets "Welcome".
const VISITED_KEY = 'pc_dashboard_visited';

function firstNameOf(user: { name?: string; email?: string } | null | undefined): string {
  const raw = (user?.name || '').trim();
  if (raw) return raw.split(/\s+/)[0];
  // Fall back to the email local-part so we still greet by something personal.
  const local = (user?.email || '').split('@')[0] || '';
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : '';
}

// eyebrow + title + optional description per route. The description lives in the
// top bar so pages don't repeat a title/subtitle in their content.
function pageMeta(path: string): { eyebrow: string; title: string; description?: string } {
  if (path.startsWith('/dashboard/territories')) return { eyebrow: 'DASHBOARD', title: 'Territory Comparison', description: 'Compare up to 4 territories side by side' };
  if (path.startsWith('/dashboard/what-if')) return { eyebrow: 'DASHBOARD', title: 'What If Calculator', description: 'Compare financial returns across territories at your budget' };
  if (path.startsWith('/dashboard/timeline')) return { eyebrow: 'DASHBOARD', title: 'Production Timeline', description: 'Track your progress from analysis to production' };
  if (path.startsWith('/dashboard/account')) return { eyebrow: 'DASHBOARD', title: 'Account' };
  if (path.startsWith('/dashboard/reports')) return { eyebrow: 'DASHBOARD', title: 'All Reports', description: 'Every report you have generated' };
  if (path.startsWith('/dashboard/business-intelligence')) return { eyebrow: 'DASHBOARD', title: 'Business Intelligence', description: 'Your subscription, deliveries and recipients' };
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
  const { user } = useAuth();
  const reducedMotion = usePrefersReducedMotion();

  // First dashboard visit in this browser → greet with "Welcome"; thereafter
  // "Welcome back". Captured once so it doesn't flip mid-session.
  const [firstVisit] = useState(() => {
    try { return !localStorage.getItem(VISITED_KEY); } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem(VISITED_KEY, '1'); } catch { /* storage unavailable — ignore */ }
  }, []);

  const baseMeta = pageMeta(location.pathname);
  // Personalise the dashboard home greeting (the only route using WELCOME BACK).
  const meta = baseMeta.eyebrow === 'WELCOME BACK'
    ? (() => {
        const name = firstNameOf(user);
        const greeting = firstVisit ? 'WELCOME' : 'WELCOME BACK';
        return { ...baseMeta, eyebrow: name ? `${greeting}, ${name.toUpperCase()}` : greeting };
      })()
    : baseMeta;
  // Routes where the global "Generate Report" button does not belong: Timeline
  // has its own "Add Milestone" primary action, and Business Intelligence is a
  // separate subscription product that has nothing to do with uploading a script.
  const hideNewAnalysis = ['/dashboard/timeline', '/dashboard/business-intelligence'].some(
    (path) => location.pathname.startsWith(path),
  );

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
                <Tooltip title="Upload a script to generate a report">
                  <Button data-tour="new-analysis" onClick={() => navigate('/analysis/new')} variant="contained" startIcon={<Add />} sx={{ whiteSpace: 'nowrap', display: { xs: 'none', sm: 'inline-flex' } }}>
                    Generate Report
                  </Button>
                </Tooltip>
                <Tooltip title="Generate report">
                  <IconButton data-tour="new-analysis-mobile" aria-label="Generate report" onClick={() => navigate('/analysis/new')} sx={{ display: { xs: 'inline-flex', sm: 'none' }, borderRadius: '10px', bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff' }}><Add /></IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title="Take the product tour">
              <IconButton
                data-tour="help"
                aria-label="Take the product tour"
                onClick={() => window.dispatchEvent(new Event(
                  // Replay the tour for the surface the user is actually on.
                  // The dashboard tour navigates to /dashboard to find its
                  // anchors, so firing it here would yank them off this page.
                  location.pathname.startsWith('/dashboard/business-intelligence')
                    ? 'pc:start-bi-tour'
                    : 'pc:start-tour',
                ))}
                sx={{ color: t.textSecondary, '&:hover': { color: t.gold, bgcolor: t.goldDim } }}
              >
                <HelpOutlineOutlined />
              </IconButton>
            </Tooltip>
            <NotificationBell />
          </Box>
        </Box>

        {/* Routed content — keyed on the path so each page fades and rises in
            on navigation, so switching sections doesn't feel like a hard cut. */}
        <Box
          key={location.pathname}
          sx={{
            flex: 1, px: { xs: 2, md: 5 }, pb: 6,
            ...(reducedMotion ? {} : {
              animation: 'pcPageIn .28s cubic-bezier(0.22, 1, 0.36, 1)',
              '@keyframes pcPageIn': {
                from: { opacity: 0, transform: 'translateY(8px)' },
                to: { opacity: 1, transform: 'none' },
              },
            }),
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* First-visit guided tour + the header "?" re-launch */}
      <OnboardingTour />
    </Box>
    </HeaderActionsContext.Provider>
  );
}
