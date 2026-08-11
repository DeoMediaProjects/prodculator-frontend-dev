import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Avatar, Box, IconButton, ListItemIcon, Menu, MenuItem, Tooltip, Typography,
} from '@mui/material';
import {
  AttachMoney, ChevronLeft, ChevronRight, DescriptionOutlined, EmojiEvents,
  ExpandLess, Groups, HistoryOutlined, HomeOutlined, Insights, LogoutOutlined,
  MonetizationOn, Movie, MovieFilterOutlined, PeopleOutline, SettingsOutlined,
  SupervisorAccount, TrendingUp, Videocam, WorkspacePremiumOutlined,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useAuth, type AdminPermissions } from '@/app/contexts/AuthContext';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';
import brandLogo from '@/assets/prodculator-logo-white.png';
import { functionalStorage } from '@/app/cookies/consent';

// Matches the B2C shell so the two consoles feel like one product.
export const ADMIN_SIDEBAR_W = 258;
export const ADMIN_SIDEBAR_COLLAPSED_W = 78;

const COLLAPSE_KEY = 'prodculator-admin-sidebar-collapsed';

export function useAdminSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return functionalStorage.get(COLLAPSE_KEY) === '1';
  });
  const toggle = () => setCollapsed((c) => {
    const next = !c;
    functionalStorage.set(COLLAPSE_KEY, next ? '1' : '0');
    return next;
  });
  return { collapsed, toggle };
}

interface AdminNavItem {
  label: string;
  to: string;
  icon: typeof HomeOutlined;
  permission?: keyof AdminPermissions;
  exact?: boolean;
}

/**
 * Admin nav, grouped.
 *
 * B2C has six destinations and a flat list works. Admin has sixteen, and a flat
 * list of sixteen is a wall, the reason the old sidebar was hard to scan. The
 * groups are the actual job boundaries (watch the business / run BI / curate the
 * datasets / handle customers / control access), so an admin can find a screen by
 * asking what they are trying to do rather than reading every label.
 */
const NAV_GROUPS: { heading: string; items: AdminNavItem[] }[] = [
  {
    heading: 'Overview',
    items: [
      { label: 'Dashboard', to: '/admin/overview', icon: HomeOutlined, exact: true },
      { label: 'Business Metrics', to: '/admin/metrics', icon: TrendingUp, permission: 'canViewBusinessMetrics' },
    ],
  },
  {
    heading: 'Intelligence',
    items: [
      { label: 'BI Clients', to: '/admin/b2b-clients', icon: WorkspacePremiumOutlined, permission: 'canManageB2B' },
      { label: 'BI Studio', to: '/admin/bi-studio', icon: Insights, permission: 'canManageB2B' },
      { label: 'Production Signals', to: '/admin/production-intel', icon: Videocam, permission: 'canViewPlatformEconomics' },
    ],
  },
  {
    heading: 'Datasets',
    items: [
      { label: 'Incentives', to: '/admin/incentives', icon: AttachMoney, permission: 'canEditIncentiveData' },
      { label: 'Grants', to: '/admin/grants', icon: MonetizationOn, permission: 'canEditIncentiveData' },
      { label: 'Festivals', to: '/admin/festivals', icon: EmojiEvents, permission: 'canEditIncentiveData' },
      { label: 'Crew & Bankability', to: '/admin/crew-depth', icon: Groups, permission: 'canEditIncentiveData' },
      { label: 'Comparables', to: '/admin/comparables', icon: Movie, permission: 'canEditComparables' },
    ],
  },
  {
    heading: 'Customers',
    items: [
      { label: 'Reports', to: '/admin/pdf-reports', icon: DescriptionOutlined, permission: 'canManagePDFReports' },
      { label: 'Script AI', to: '/admin/script-ai', icon: MovieFilterOutlined },
      { label: 'Email Gating', to: '/admin/email-gating', icon: PeopleOutline, permission: 'canManageEmailGating' },
    ],
  },
  {
    heading: 'Platform',
    items: [
      { label: 'Data Sources', to: '/admin/data-sources', icon: SettingsOutlined, permission: 'canManageDataSources' },
      { label: 'Admin Users', to: '/admin/users', icon: SupervisorAccount, permission: 'canManageAdmins' },
      { label: 'Audit Trail', to: '/admin/audit-trail', icon: HistoryOutlined, permission: 'canManageAdmins' },
    ],
  },
];

/** Flat list of every admin destination, for the layout's page-title lookup. */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = NAV_GROUPS.flatMap((g) => g.items);

export function AdminSidebar({
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
  const { adminLogout, hasAdminPermission, adminUser } = useAuth();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const visibleGroups = NAV_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.permission || hasAdminPermission(item.permission)),
    }))
    // A role that holds nothing in a group should not see its heading either.
    .filter((group) => group.items.length > 0);

  const isActive = (item: AdminNavItem) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const go = (to: string) => { navigate(to); onNavigate?.(); };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const { error } = await adminLogout();
    setLoggingOut(false);
    if (!error) navigate('/admin/login');
  };

  const email = adminUser?.email || '';
  const roleLabel = (adminUser?.role || '').replace(/_/g, ' ');
  const initials = (adminUser?.name || email || 'A')
    .split(/[\s@.]+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'A';

  return (
    <Box
      sx={{
        width: '100%', height: '100%', bgcolor: t.sidebarBg,
        borderRight: `1px solid ${t.border}`,
        display: 'flex', flexDirection: 'column',
        px: collapsed ? 1.25 : 2.5, py: 3,
      }}
    >
      {/* Logo + collapse control */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', mb: 2.5, px: collapsed ? 0 : 0.5, height: 46 }}>
        {!collapsed && (
          <Box
            onClick={() => go('/admin/overview')}
            sx={{ cursor: 'pointer', minWidth: 0 }}
          >
            <Box
              component="img"
              src={brandLogo}
              alt="Prodculator"
              sx={{ width: 150, height: 'auto', display: 'block', filter: mode === 'light' ? 'invert(1)' : 'none' }}
            />
            {/* Says which console you are in. Admins also hold a customer
                account, and the two shells are deliberately alike. */}
            <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: t.gold, mt: 0.75 }}>
              ADMIN
            </Typography>
          </Box>
        )}
        {onToggleCollapse && (
          <Tooltip title={collapsed ? 'Expand' : 'Collapse'} placement="right">
            <IconButton
              onClick={onToggleCollapse}
              size="small"
              aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
              sx={{ color: t.textSecondary, border: `1px solid ${t.border}`, borderRadius: '9px', '&:hover': { color: t.gold, borderColor: t.gold } }}
            >
              {collapsed ? <ChevronRight sx={{ fontSize: 20 }} /> : <ChevronLeft sx={{ fontSize: 20 }} />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Nav, scrolls independently of the profile block so sign-out is always
          reachable, however many groups a role can see. */}
      <Box
        component="nav"
        aria-label="Admin sections"
        sx={{
          flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden',
          display: 'flex', flexDirection: 'column', gap: 0.25,
          mx: -0.5, px: 0.5,
          scrollbarWidth: 'thin',
          scrollbarColor: `${t.border} transparent`,
        }}
      >
        {visibleGroups.map((group, groupIndex) => (
          <Box key={group.heading} sx={{ mb: 1 }}>
            {collapsed ? (
              // A rule instead of a heading: the grouping still reads, without
              // truncating labels into initials that mean nothing.
              groupIndex > 0 && <Box sx={{ height: '1px', bgcolor: t.border, mx: 1.5, my: 1.25 }} />
            ) : (
              <Typography
                sx={{
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.16em',
                  color: t.textFaint, textTransform: 'uppercase',
                  px: 1.75, mt: groupIndex === 0 ? 0 : 1.75, mb: 0.75,
                }}
              >
                {group.heading}
              </Typography>
            )}
            {group.items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              const node = (
                <Box
                  key={item.to}
                  onClick={() => go(item.to)}
                  role="link"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(item.to); } }}
                  aria-current={active ? 'page' : undefined}
                  sx={{
                    display: 'flex', alignItems: 'center', gap: 1.6,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    px: collapsed ? 0 : 1.75, py: 1.15, borderRadius: '10px',
                    cursor: 'pointer', position: 'relative',
                    transition: 'background .15s, color .15s',
                    color: active ? t.gold : t.textSecondary,
                    bgcolor: active ? t.goldDim : 'transparent',
                    '&:hover': { bgcolor: active ? t.goldDim : t.borderSoft, color: active ? t.gold : t.textPrimary },
                    '&:focus-visible': { outline: `2px solid ${t.gold}`, outlineOffset: 2 },
                    // Active rail, same as the B2C sidebar.
                    '&::before': active && !collapsed
                      ? { content: '""', position: 'absolute', left: -20, top: 9, bottom: 9, width: 3, borderRadius: '3px', bgcolor: t.gold }
                      : {},
                  }}
                >
                  <Icon sx={{ fontSize: 21, flexShrink: 0 }} />
                  {!collapsed && (
                    <Typography sx={{ fontSize: 14.5, fontWeight: active ? 700 : 500, color: 'inherit', lineHeight: 1.25 }}>
                      {item.label}
                    </Typography>
                  )}
                </Box>
              );
              return collapsed
                ? <Tooltip key={item.to} title={item.label} placement="right">{node}</Tooltip>
                : node;
            })}
          </Box>
        ))}
      </Box>

      {/* Admin identity + actions */}
      <Box sx={{ borderTop: `1px solid ${t.border}`, pt: 2, mt: 1 }}>
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
          <Avatar sx={{ width: 38, height: 38, bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff', fontWeight: 700, fontSize: 14 }}>
            {initials}
          </Avatar>
          {!collapsed && (
            <>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {adminUser?.name || email || 'Admin'}
                </Typography>
                {/* Role, not email: which permissions you hold is the thing that
                    changes what this console does. */}
                <Typography sx={{ fontSize: 11.5, color: t.gold, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textTransform: 'capitalize' }}>
                  {roleLabel || 'No role assigned'}
                </Typography>
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
          slotProps={{ paper: { sx: { bgcolor: t.cardBg, border: `1px solid ${t.border}`, minWidth: 224, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' } } }}
        >
          {email && (
            <Box sx={{ px: 2, pt: 1, pb: 1.25, borderBottom: `1px solid ${t.border}` }}>
              <Typography sx={{ fontSize: 12, color: t.textSecondary, wordBreak: 'break-all' }}>{email}</Typography>
            </Box>
          )}
          <MenuItem onClick={() => { setAnchorEl(null); navigate('/'); }} sx={{ color: t.textPrimary, py: 1.1 }}>
            <ListItemIcon sx={{ color: t.textSecondary, minWidth: 34 }}><HomeOutlined sx={{ fontSize: 20 }} /></ListItemIcon>
            Back to main site
          </MenuItem>
          <MenuItem
            onClick={() => { setAnchorEl(null); void handleLogout(); }}
            disabled={loggingOut}
            sx={{ color: t.textPrimary, py: 1.1 }}
          >
            <ListItemIcon sx={{ color: t.textSecondary, minWidth: 34 }}>
              {loggingOut ? <LoadingSpinner size={20} /> : <LogoutOutlined sx={{ fontSize: 20 }} />}
            </ListItemIcon>
            {loggingOut ? 'Signing out...' : 'Sign out'}
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
