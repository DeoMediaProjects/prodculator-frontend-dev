import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  InputAdornment,
  IconButton,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { authService } from '@/services/auth.service';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import logoMark from '@/assets/prodculator-logo-white.png';

// Simple, pragmatic email shape check — non-empty local part, "@", domain with a dot.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userLogin, googleLogin } = useAuth();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  // ProtectedRoute redirects here with the page the user was actually trying
  // to reach (e.g. /what-if or /upload) — send them back there after signing
  // in, instead of always dropping them on /dashboard.
  const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot-password dialog state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  // Tracks whether the user has interacted with the field, so we don't flag the
  // email as invalid before they've had a chance to type.
  const [forgotTouched, setForgotTouched] = useState(false);

  const isForgotEmailValid = EMAIL_REGEX.test(forgotEmail.trim());
  // Only flag the field once the user has actually typed something invalid — an
  // empty field is never shown as an error (the disabled submit button covers it).
  const showForgotEmailError = forgotTouched && forgotEmail.trim().length > 0 && !isForgotEmailValid;

  const openForgot = () => {
    setForgotEmail(email);
    setForgotSent(false);
    setForgotTouched(false);
    setForgotOpen(true);
  };

  const handleForgotSubmit = async () => {
    if (!isForgotEmailValid) {
      setForgotTouched(true);
      return;
    }
    setForgotLoading(true);
    // The API responds with a generic success regardless of whether the address is
    // registered, so we always show the same confirmation (no account enumeration).
    await authService.resetPassword(forgotEmail.trim());
    setForgotLoading(false);
    setForgotSent(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { success, error: loginError, needsVerification } = await userLogin(email, password);

      if (success) {
        navigate(redirectTo);
      } else if (needsVerification) {
        // Credentials were valid but the email isn't verified — send them to the
        // "check your email" screen, which can resend the verification link.
        navigate('/verify-email', { state: { email } });
      } else {
        setError(loginError || 'Invalid credentials. Please check your email and password.');
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const success = await googleLogin();

      if (success) {
        navigate(redirectTo);
      } else {
        setError('Google sign in failed. Please try again.');
      }
    } catch (_err) {
      setError('Google sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      {loading && <LoadingSpinner overlay message="Signing in..." />}

      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3 }}>
          <img
            src={logoMark}
            alt="Prodculator"
            style={{ height: '34px', width: 'auto', filter: mode === 'light' ? 'invert(1)' : 'none' }}
          />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Welcome back
        </Typography>
        <Typography variant="body1" sx={{ color: t.textPrimary }}>
          Sign in to your Prodculator account
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          border: `1px solid ${t.border}`,
          borderRadius: 3,
        }}
      >
        {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
                sx={{ mb: 1.5 }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        sx={{ color: t.textSecondary }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Button
                  onClick={openForgot}
                  variant="text"
                  sx={{ fontSize: '0.875rem', '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' } }}
                >
                  Forgot password?
                </Button>
              </Box>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.4, fontSize: '1rem' }}
              >
                Sign In
              </Button>
            </Box>

            <Divider sx={{ my: 4 }}>
              <Typography variant="body2" sx={{ color: t.textPrimary, fontWeight: 500, px: 1 }}>
                or continue with
              </Typography>
            </Divider>

            <Button
              fullWidth
              variant="outlined"
              size="large"
              disabled={loading}
              onClick={handleGoogleSignIn}
              startIcon={
                <svg width="20" height="20" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
              }
              sx={{ py: 1.4 }}
            >
              Sign in with Google
            </Button>

            <Typography variant="body2" sx={{ color: t.textPrimary, textAlign: 'center', mt: 3 }}>
              Don't have an account?{' '}
              <Link component={RouterLink} to="/signup" state={location.state} sx={{ color: t.gold, fontWeight: 600 }}>
                Create one
              </Link>
            </Typography>
          </Paper>

      <Dialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        PaperProps={{
          sx: {
            border: `1px solid ${t.border}`,
            borderRadius: 3,
            maxWidth: 440,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Reset your password</DialogTitle>
        <DialogContent>
          {forgotSent ? (
            <Alert severity="success">
              If an account exists for that email, we've sent a link to reset your password.
              Check your inbox (and spam folder).
            </Alert>
          ) : (
            <>
              <DialogContentText sx={{ color: t.textSecondary, mb: 2 }}>
                Enter your account email and we'll send you a link to reset your password.
              </DialogContentText>
              <TextField
                fullWidth
                autoFocus
                type="email"
                label="Email Address"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                onBlur={() => setForgotTouched(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleForgotSubmit();
                  }
                }}
                error={showForgotEmailError}
                helperText={showForgotEmailError ? 'Enter a valid email address.' : ' '}
                inputProps={{ inputMode: 'email', maxLength: 254 }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setForgotOpen(false)} sx={{ color: t.textSecondary }}>
            {forgotSent ? 'Close' : 'Cancel'}
          </Button>
          {!forgotSent && (
            <Button
              onClick={handleForgotSubmit}
              variant="contained"
              disabled={forgotLoading || !isForgotEmailValid}
              startIcon={forgotLoading ? <CircularProgress size={18} sx={{ color: mode === 'dark' ? '#000' : '#fff' }} /> : undefined}
            >
              {forgotLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </AuthLayout>
  );
}
