import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, ErrorOutline } from '@mui/icons-material';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import { authService } from '@/services/auth.service';

type Status = 'loading' | 'success' | 'error';

export function EmailVerifyCallback() {
  const navigate = useNavigate();
  const location = useLocation();
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
    <Box
      sx={{
        minHeight: '100vh',
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

          {status === 'loading' && (
            <>
              <CircularProgress sx={{ color: '#D4AF37', mb: 3 }} size={60} />
              <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 600 }}>
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
                Email Verified!
              </Typography>
              <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 4 }}>
                Your account is confirmed. Redirecting to your dashboard in {countdown}s…
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/dashboard', { replace: true })}
                sx={{
                  bgcolor: '#D4AF37',
                  color: '#000000',
                  fontWeight: 700,
                  py: 1.5,
                  '&:hover': { bgcolor: '#B8941F' },
                }}
              >
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
                  bgcolor: 'rgba(244, 67, 54, 0.1)',
                  border: '2px solid #f44336',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <ErrorOutline sx={{ fontSize: 40, color: '#f44336' }} />
              </Box>
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 2 }}>
                Verification Failed
              </Typography>
              <Alert
                severity="error"
                sx={{
                  mb: 4,
                  bgcolor: 'rgba(244, 67, 54, 0.1)',
                  color: '#f44336',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  textAlign: 'left',
                }}
              >
                {errorMessage}
              </Alert>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/verify-email')}
                  sx={{
                    borderColor: '#D4AF37',
                    color: '#D4AF37',
                    fontWeight: 600,
                    py: 1.2,
                    '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.1)' },
                  }}
                >
                  Request New Verification Email
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  sx={{
                    color: '#a0a0a0',
                    '&:hover': { color: '#D4AF37', bgcolor: 'transparent' },
                  }}
                >
                  Back to Login
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
