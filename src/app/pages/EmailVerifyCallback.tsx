import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import { authService } from '@/services/auth.service';

type Status = 'loading' | 'success' | 'error';

export function EmailVerifyCallback() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    async function handleCallback() {
      if (!token) {
        setErrorMessage('Verification link is invalid or has expired. Please request a new one.');
        setStatus('error');
        return;
      }

      const { error } = await authService.verifyEmailToken(token);

      if (error) {
        setErrorMessage(error);
        setStatus('error');
        return;
      }

      setStatus('success');
    }

    handleCallback();
  }, [location.search]);

  useEffect(() => {
    if (status !== 'success') return;
    if (countdown === 0) {
      navigate('/dashboard', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [status, countdown, navigate]);

  return (
    <AuthLayout>
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          border: `1px solid ${t.border}`,
          borderRadius: 3,
          textAlign: 'center',
        }}
      >
        {status === 'loading' && (
          <>
            <CircularProgress sx={{ color: t.gold, mb: 3 }} size={60} />
            <Typography variant="h5" sx={{ color: t.textPrimary, fontWeight: 600 }}>
              Verifying your email...
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: `${t.success}1a`,
                border: `2px solid ${t.success}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <CheckCircle sx={{ fontSize: 40, color: t.success }} />
            </Box>
            <Typography variant="h4" sx={{ color: t.gold, fontWeight: 700, mb: 2 }}>
              Email Verified!
            </Typography>
            <Typography variant="body1" sx={{ color: t.textSecondary, mb: 4 }}>
              Your account is confirmed. Redirecting to your dashboard in {countdown}s…
            </Typography>
            <Button variant="contained" fullWidth onClick={() => navigate('/dashboard', { replace: true })} sx={{ py: 1.5 }}>
              Go to Dashboard
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                bgcolor: `${t.error}1a`,
                border: `2px solid ${t.error}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
              }}
            >
              <ErrorOutline sx={{ fontSize: 40, color: t.error }} />
            </Box>
            <Typography variant="h4" sx={{ color: t.textPrimary, fontWeight: 700, mb: 2 }}>
              Verification Failed
            </Typography>
            <Alert severity="error" sx={{ mb: 4, textAlign: 'left' }}>
              {errorMessage}
            </Alert>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button variant="outlined" fullWidth onClick={() => navigate('/verify-email')} sx={{ py: 1.2 }}>
                Request New Verification Email
              </Button>
              <Button onClick={() => navigate('/login')} sx={{ color: t.textSecondary, '&:hover': { color: t.gold, bgcolor: 'transparent' } }}>
                Back to Login
              </Button>
            </Box>
          </>
        )}
      </Paper>
    </AuthLayout>
  );
}
