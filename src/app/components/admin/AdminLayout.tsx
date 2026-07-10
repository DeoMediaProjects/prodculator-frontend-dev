import { useState } from 'react';
import { Navigate, Outlet, useNavigate, useLocation } from 'react-router';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Dashboard,
  AttachMoney,
  Email,
  Description,
  Movie,
  Settings,
  TrendingUp,
  AccountCircle,
  SupervisorAccount,
  Logout,
  MonetizationOn,
  EmojiEvents,
  BusinessCenter,
  Videocam,
} from '@mui/icons-material';
import { useAuth, type AdminPermissions } from '@/app/contexts/AuthContext';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';

const drawerWidth = 240;

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLogout, hasAdminPermission, isAdminAuthenticated, isAdminAuthLoading } = useAuth();
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const menuItems: { label: string; path: string; icon: JSX.Element; permission?: keyof AdminPermissions }[] = [
    { label: 'Overview', path: '/admin/overview', icon: <Dashboard /> },
    { label: 'Business Metrics', path: '/admin/metrics', icon: <TrendingUp />, permission: 'canViewBusinessMetrics' },
    { label: 'B2B Clients', path: '/admin/b2b-clients', icon: <BusinessCenter />, permission: 'canManageB2B' },
    { label: 'Production Intelligence', path: '/admin/production-intel', icon: <Videocam />, permission: 'canViewPlatformEconomics' },
    { label: 'Script AI Overview', path: '/admin/script-ai', icon: <AccountCircle /> },
    { label: 'Incentive Data', path: '/admin/incentives', icon: <AttachMoney />, permission: 'canEditIncentiveData' },
    { label: 'Grants Manager', path: '/admin/grants', icon: <MonetizationOn />, permission: 'canEditIncentiveData' },
    { label: 'Festivals Manager', path: '/admin/festivals', icon: <EmojiEvents />, permission: 'canEditIncentiveData' },
    { label: 'Comparable Productions', path: '/admin/comparables', icon: <Movie />, permission: 'canEditComparables' },
    { label: 'API & Data Sources', path: '/admin/data-sources', icon: <Settings />, permission: 'canManageDataSources' },
    { label: 'Email Gating', path: '/admin/email-gating', icon: <Email />, permission: 'canManageEmailGating' },
    { label: 'PDF Reports', path: '/admin/pdf-reports', icon: <Description />, permission: 'canManagePDFReports' },
    { label: 'User Management', path: '/admin/users', icon: <SupervisorAccount />, permission: 'canManageAdmins' },
  ];
  const visibleMenuItems = menuItems.filter((item) => !item.permission || hasAdminPermission(item.permission));

  if (isAdminAuthLoading) {
    return <LoadingSpinner overlay message="Loading admin session..." />;
  }

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    const { error } = await adminLogout();
    setLoggingOut(false);
    if (error) {
      setLogoutError(error);
    } else {
      navigate('/admin/login');
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Prodculator Admin
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', mt: 2 }}>
          <List>
            {visibleMenuItems.map((item) => (
              <ListItem key={item.path} disablePadding>
                <ListItemButton
                  selected={location.pathname === item.path}
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          
          {/* Divider and User Links */}
          {/* <Box sx={{ borderTop: '1px solid rgba(212, 175, 55, 0.2)', mt: 2, pt: 2 }}>
            <List>
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate('/')}>
                  <ListItemIcon><Home /></ListItemIcon>
                  <ListItemText primary="Home" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => navigate('/dashboard')}>
                  <ListItemIcon><AccountCircle /></ListItemIcon>
                  <ListItemText primary="User Dashboard" />
                </ListItemButton>
              </ListItem>
            </List>
          </Box> */}
          
          {/* Admin Actions */}
          <Box sx={{ mt: 2 }}>
            <List>
              <ListItem disablePadding>
                <ListItemButton onClick={handleLogout} disabled={loggingOut}>
                  <ListItemIcon>
                    {loggingOut ? <LoadingSpinner size={20} /> : <Logout />}
                  </ListItemIcon>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </ListItem>
            </List>
          </Box>
        </Box>
      </Drawer>
      
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Container maxWidth="xl">
          <Outlet />
        </Container>
      </Box>

      {loggingOut && <LoadingSpinner overlay message="Signing out..." />}

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
  );
}
