import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  Alert, Box, Button, IconButton, InputAdornment, Paper, TextField, Typography,
} from '@mui/material';
import {
  LockOutlined, Visibility, VisibilityOff,
} from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import { useAuth } from '@/app/contexts/AuthContext';
import { AdminThemeProvider } from './AdminThemeProvider';

export function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { adminLogin, isAdminAuthenticated } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // AdminLayout redirects here with the screen the admin was trying to reach,
  // so send them back there rather than always to the dashboard.
  const from = (location.state as { from?: { pathname: string } } | null)?.from;
  const redirectTo = from?.pathname?.startsWith('/admin') ? from.pathname : '/admin/overview';

  useEffect(() => {
    if (isAdminAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAdminAuthenticated, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const success = await adminLogin(email, password);
      if (success) navigate(redirectTo, { replace: true });
      // Deliberately does not say which of the two was wrong: naming the field
      // confirms whether an admin address exists, and admin credentials are the
      // highest-value target in the system.
      else setError('Those credentials were not accepted. Check the email and password and try again.');
    } catch {
      setError('Could not reach the sign-in service. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminThemeProvider>
    <AuthLayout>
      <Paper
        elevation={0}
        sx={{ p: { xs: 3, sm: 5 }, border: `1px solid ${t.border}`, borderRadius: 3 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: '10px',
              bgcolor: t.goldDim, border: `1px solid ${t.gold}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <LockOutlined sx={{ fontSize: 21, color: t.gold }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.22em', color: t.gold }}>
              ADMIN CONSOLE
            </Typography>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, lineHeight: 1.2 }}>
              Sign in
            </Typography>
          </Box>
        </Box>

        <Typography sx={{ color: t.textSecondary, fontSize: 14, mb: 3.5 }}>
          Staff access only. Customer accounts sign in from the main site.
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            fullWidth
            label="Work email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            disabled={loading}
            sx={{ mb: 3 }}
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            disabled={loading}
            sx={{ mb: 3.5 }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((s) => !s)}
                      edge="end"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      sx={{ color: t.textSecondary }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading || !email.trim() || !password}
            sx={{ py: 1.4, fontSize: '1rem' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </Box>

        <Typography sx={{ color: t.textFaint, fontSize: 12, mt: 3.5, lineHeight: 1.7 }}>
          Every action taken in this console is recorded against your account, including
          the state of anything you change. Sign-in attempts are rate limited.
        </Typography>
      </Paper>
    </AuthLayout>
    </AdminThemeProvider>
  );
}
