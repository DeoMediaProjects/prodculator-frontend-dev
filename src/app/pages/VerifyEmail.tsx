import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Box,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Email, CheckCircle, Refresh } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import { authService } from '@/services/auth.service';

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const email = (location.state as any)?.email || 'your email';

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCanResend(true);
    }
  }, [countdown, canResend]);

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendError('');
    setResendSuccess(false);

    try {
      const { error } = await authService.resendVerification(email);
      if (error) {
        throw new Error(error);
      }

      setResendSuccess(true);
      setCanResend(false);
      setCountdown(60);
    } catch (err: any) {
      console.error('Resend email error:', err);
      setResendError(err.message || 'Failed to resend email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

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
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: t.goldDim,
            border: `2px solid ${t.gold}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <Email sx={{ fontSize: 40, color: t.gold }} />
        </Box>

        <Typography variant="h4" sx={{ color: t.gold, fontWeight: 700, mb: 2 }}>
          Check Your Email
        </Typography>

        <Typography variant="body1" sx={{ color: t.textPrimary, mb: 1 }}>
          We've sent a verification link to:
        </Typography>
        <Typography variant="h6" sx={{ color: t.gold, mb: 3, fontWeight: 600 }}>
          {email}
        </Typography>

        <Alert severity="info" icon={<CheckCircle />} sx={{ mb: 4, textAlign: 'left' }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
            Next Steps:
          </Typography>
          <Typography variant="body2" component="div">
            1. Check your inbox (and spam folder)<br />
            2. Click the verification link in the email<br />
            3. You'll be redirected back to complete setup
          </Typography>
        </Alert>

        {resendSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Verification email sent! Please check your inbox.
          </Alert>
        )}

        {resendError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {resendError}
          </Alert>
        )}

        <Box sx={{ mb: 4 }}>
          <Typography variant="body2" sx={{ color: t.textSecondary, mb: 2 }}>
            Didn't receive the email?
          </Typography>
          <Button
            variant="outlined"
            startIcon={resendLoading ? <CircularProgress size={20} /> : <Refresh />}
            onClick={handleResendEmail}
            disabled={!canResend || resendLoading}
            fullWidth
            sx={{ py: 1.2 }}
          >
            {resendLoading
              ? 'Sending...'
              : canResend
                ? 'Resend Verification Email'
                : `Resend in ${countdown}s`}
          </Button>
        </Box>

        <Box sx={{ pt: 3, borderTop: `1px solid ${t.border}` }}>
          <Typography variant="body2" sx={{ color: t.textSecondary, mb: 2 }}>
            Need help?
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              onClick={() => navigate('/login')}
              sx={{ color: t.textSecondary, textDecoration: 'underline', '&:hover': { color: t.gold, bgcolor: 'transparent' } }}
            >
              Back to Login
            </Button>
            <Button
              onClick={() => navigate('/')}
              sx={{ color: t.textSecondary, textDecoration: 'underline', '&:hover': { color: t.gold, bgcolor: 'transparent' } }}
            >
              Home
            </Button>
          </Box>
        </Box>

        <Alert severity="warning" sx={{ mt: 4, textAlign: 'left' }}>
          <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
            <strong>Important:</strong> You must verify your email before you can upload scripts or access reports.
            The verification link expires in 24 hours.
          </Typography>
        </Alert>
      </Paper>
    </AuthLayout>
  );
}
