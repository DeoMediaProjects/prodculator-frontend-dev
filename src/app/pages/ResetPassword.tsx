import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, CheckCircle } from '@mui/icons-material';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import { authService } from '@/services/auth.service';

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // Redirect to the dashboard's login after a successful reset.
  useEffect(() => {
    if (!success) return;
    if (countdown === 0) {
      navigate('/login', { replace: true });
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [success, countdown, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Reset link is invalid or has expired. Please request a new one.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: resetError } = await authService.confirmPasswordReset(token, password);
    setLoading(false);

    if (resetError) {
      setError(resetError);
      return;
    }
    setSuccess(true);
  };

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        bgcolor: '#000000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        py: 6,
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '800px',
          height: '800px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0) 70%)',
          filter: 'blur(120px)',
          pointerEvents: 'none',
        }}
      />

      <Container maxWidth="sm">
        <Paper
          elevation={0}
          sx={{
            p: 6,
            bgcolor: '#0a0a0a',
            border: '2px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 3,
            position: 'relative',
            zIndex: 1,
            textAlign: 'center',
          }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
            <img src={exampleLogo} alt="Prodculator" style={{ height: '48px', width: 'auto' }} />
          </Box>

          {success ? (
            <>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  bgcolor: 'rgba(76, 175, 80, 0.1)',
                  border: '2px solid #4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <CheckCircle sx={{ fontSize: 40, color: '#4caf50' }} />
              </Box>
              <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700, mb: 2 }}>
                Password Updated
              </Typography>
              <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 4 }}>
                You can now sign in with your new password. Redirecting to login in {countdown}s…
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/login', { replace: true })}
                sx={{
                  bgcolor: '#D4AF37',
                  color: '#000000',
                  fontWeight: 700,
                  py: 1.5,
                  '&:hover': { bgcolor: '#B8941F' },
                }}
              >
                Go to Login
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700, mb: 1 }}>
                Set a New Password
              </Typography>
              <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 4 }}>
                Choose a new password for your Prodculator account.
              </Typography>

              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    bgcolor: 'rgba(244, 67, 54, 0.1)',
                    color: '#f44336',
                    border: '1px solid rgba(244, 67, 54, 0.3)',
                    textAlign: 'left',
                  }}
                >
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{ mb: 3 }}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#a0a0a0' }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  label="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sx={{ mb: 4 }}
                />

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} sx={{ color: '#000' }} /> : undefined}
                  sx={{
                    bgcolor: '#D4AF37',
                    color: '#000000',
                    fontWeight: 700,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': { bgcolor: '#B8941F' },
                    '&:disabled': { bgcolor: '#665827', color: '#000' },
                  }}
                >
                  {loading ? 'Updating…' : 'Update Password'}
                </Button>
              </Box>

              <Button
                onClick={() => navigate('/login')}
                sx={{
                  mt: 3,
                  color: '#a0a0a0',
                  '&:hover': { color: '#D4AF37', bgcolor: 'transparent' },
                }}
              >
                Back to Login
              </Button>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
