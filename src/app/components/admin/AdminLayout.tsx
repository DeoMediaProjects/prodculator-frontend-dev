import { useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import {
  Alert, Box, Drawer, IconButton, Snackbar, Tooltip, Typography,
  useMediaQuery, useTheme,
} from '@mui/material';
import {
  DarkModeOutlined, LightModeOutlined, Menu as MenuIcon, OpenInNewOutlined,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth } from '@/app/contexts/AuthContext';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { usePrefersReducedMotion } from '@/app/components/user/b2c/tourStyles';
import { AdminThemeProvider } from './AdminThemeProvider';
import {
  ADMIN_NAV_ITEMS, ADMIN_SIDEBAR_COLLAPSED_W, ADMIN_SIDEBAR_W,
  AdminSidebar, useAdminSidebarCollapsed,
} from './AdminSidebar';

/**
 * Page title and one-line purpose per route, shown in the top bar.
 *
 * Lives here rather than in each screen for the same reason as the B2C shell:
 * one place decides the heading, so no page repeats a title in its own content
 * and the two consoles stay structurally identical.
 */
const PAGE_META: Record<string, { title: string; description?: string }> = {
  '/admin/overview': { title: 'Dashboard', description: 'Platform health, recent activity and outstanding data work' },
  '/admin/metrics': { title: 'Business Metrics', description: 'Revenue, retention and conversion across the platform' },
  '/admin/b2b-clients': { title: 'Business Intelligence Clients', description: 'Subscriptions, contract invites, deliveries and recipients' },
  '/admin/bi-studio': { title: 'Business Intelligence Studio', description: 'Compose and generate bespoke intelligence packages' },
  '/admin/production-intel': { title: 'Production Signals', description: 'The consented signal pool behind every intelligence product' },
  '/admin/incentives': { title: 'Incentive Programmes', description: 'Rates, caps and eligibility rules that drive every report' },
  '/admin/grants': { title: 'Grants & Funds', description: 'Soft-money programmes matched into reports' },
  '/admin/festivals': { title: 'Festivals', description: 'Submission windows and eligibility used by the festival matcher' },
  '/admin/crew-depth': { title: 'Crew Depth & Bankability', description: 'Territory profiles, payment timing and bankability research' },
  '/admin/comparables': { title: 'Comparable Productions', description: 'Reference productions used to anchor budgets' },
  '/admin/pdf-reports': { title: 'Customer Reports', description: 'Generated reports, delivery state and re-issue' },
  '/admin/script-ai': { title: 'Script AI', description: 'Analysis pipeline behaviour and model availability' },
  '/admin/email-gating': { title: 'Email Gating', description: 'Free-report abuse prevention per email address' },
  '/admin/data-sources': { title: 'Data Sources', description: 'External integrations and their sync schedules' },
  '/admin/users': { title: 'Admin Users', description: 'Who holds admin access, and what they can do with it' },
  '/admin/audit-trail': { title: 'Audit Trail', description: 'Every change an admin has made, with before and after state' },
};

function pageMeta(pathname: string): { title: string; description?: string } {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  // Nested or trailing-slash paths fall back to the longest matching prefix, so
  // a sub-route still gets its parent's heading instead of a blank bar.
  const match = ADMIN_NAV_ITEMS
    .filter((item) => pathname.startsWith(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return (match && PAGE_META[match.to]) || { title: 'Admin' };
}

export function AdminLayout() {
  const location = useLocation();
  const { mode, toggle } = useThemeMode();
  const t = tokens(mode);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const reducedMotion = usePrefersReducedMotion();
  const { isAdminAuthenticated, isAdminAuthLoading } = useAuth();
  const { collapsed, toggle: toggleCollapsed } = useAdminSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // The session check is async; redirecting before it settles would bounce a
  // signed-in admin to the login screen on every refresh.
  if (isAdminAuthLoading) {
    return <LoadingSpinner overlay message="Loading admin session..." />;
  }
  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  const meta = pageMeta(location.pathname);

  return (
    <AdminThemeProvider>
    <Box className="admin-shell" sx={{ display: 'flex', minHeight: '100vh', bgcolor: t.pageBg }}>
      {isDesktop ? (
        <Box
          sx={{
            width: collapsed ? ADMIN_SIDEBAR_COLLAPSED_W : ADMIN_SIDEBAR_W,
            flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
            transition: 'width .22s ease',
            zIndex: (th) => th.zIndex.appBar,
          }}
        >
          <AdminSidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </Box>
      ) : (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          slotProps={{ paper: { sx: { border: 'none', width: ADMIN_SIDEBAR_W } } }}
        >
          <AdminSidebar onNavigate={() => setMobileOpen(false)} />
        </Drawer>
      )}

      <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* Top bar */}
        <Box
          sx={{
            position: 'sticky', top: 0,
            zIndex: (th) => th.zIndex.appBar,
            bgcolor: t.pageBg,
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            alignItems: { xs: 'stretch', md: 'center' },
            justifyContent: 'space-between',
            gap: { xs: 1.5, md: 2 },
            px: { xs: 2, md: 4 },
            py: { xs: 2, md: 3 },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: t.textSecondary }}>
              ADMIN CONSOLE
            </Typography>
            <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.15 }}>
              {meta.title}
            </Typography>
            {meta.description && (
              <Typography sx={{ fontSize: 13.5, color: t.textSecondary, mt: 0.5 }}>
                {meta.description}
              </Typography>
            )}
          </Box>

          <Box
            sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0,
              order: { xs: -1, md: 0 },
              justifyContent: { xs: 'space-between', md: 'flex-end' },
            }}
          >
            {/* Menu sits left of everything on mobile, per the shell convention. */}
            {!isDesktop && (
              <IconButton
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
                sx={{ color: t.textPrimary, ml: -1 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SegmentedToggle
                radius={12}
                value={mode}
                onChange={(v) => v !== mode && toggle()}
                options={[
                  { value: 'light', icon: <LightModeOutlined sx={{ fontSize: 18 }} /> },
                  { value: 'dark', icon: <DarkModeOutlined sx={{ fontSize: 18 }} /> },
                ]}
              />
              <Tooltip title="Open the customer-facing site in a new tab">
                <IconButton
                  component="a"
                  href="/"
                  target="_blank"
                  rel="noopener"
                  aria-label="Open the customer site in a new tab"
                  sx={{ color: t.textSecondary, '&:hover': { color: t.gold, bgcolor: t.goldDim } }}
                >
                  <OpenInNewOutlined />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Box>

        {/* Routed content. Keyed on path so switching sections settles rather
            than hard-cutting, matching the B2C shell exactly. */}
        <Box
          key={location.pathname}
          sx={{
            flex: 1, minWidth: 0, px: { xs: 2, md: 4 }, pb: 6, ...(reducedMotion ? {} : {
              animation: 'pcAdminPageIn .28s cubic-bezier(0.22, 1, 0.36, 1)',
              '@keyframes pcAdminPageIn': {
                from: { opacity: 0, transform: 'translateY(8px)' },
                to: { opacity: 1, transform: 'none' },
              },
            }),
          }}
        >
          <Outlet />
        </Box>
      </Box>

      <Snackbar
        open={!!logoutError}
        autoHideDuration={6000}
        onClose={() => setLogoutError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setLogoutError(null)}>
          Logout failed: {logoutError}
        </Alert>
      </Snackbar>
    </Box>
    </AdminThemeProvider>
  );
}
