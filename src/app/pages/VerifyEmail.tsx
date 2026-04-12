import { useState, useEffect } from 'react';
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
import { Email, CheckCircle, Refresh } from '@mui/icons-material';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import { authService } from '@/services/auth.service';

export function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
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
      {/* Background gradient */}
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
            <img 
              src={exampleLogo} 
              alt="Prodculator" 
              style={{ height: '48px', width: 'auto' }}
            />
          </Box>

          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              bgcolor: 'rgba(212, 175, 55, 0.1)',
              border: '2px solid #D4AF37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <Email sx={{ fontSize: 40, color: '#D4AF37' }} />
          </Box>

          <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700, mb: 2 }}>
            Check Your Email
          </Typography>

          <Typography variant="body1" sx={{ color: '#ffffff', mb: 1 }}>
            We've sent a verification link to:
          </Typography>
          <Typography variant="h6" sx={{ color: '#D4AF37', mb: 3, fontWeight: 600 }}>
            {email}
          </Typography>

          <Alert 
            severity="info" 
            icon={<CheckCircle />}
            sx={{ 
              mb: 4,
              bgcolor: 'rgba(33, 150, 243, 0.1)',
              color: '#64b5f6',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              textAlign: 'left',
            }}
          >
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
            <Alert 
              severity="success" 
              sx={{ 
                mb: 3,
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                color: '#81c784',
                border: '1px solid rgba(76, 175, 80, 0.3)',
              }}
            >
              Verification email sent! Please check your inbox.
            </Alert>
          )}

          {resendError && (
            <Alert 
              severity="error" 
              sx={{ 
                mb: 3,
                bgcolor: 'rgba(244, 67, 54, 0.1)',
                color: '#f44336',
                border: '1px solid rgba(244, 67, 54, 0.3)',
              }}
            >
              {resendError}
            </Alert>
          )}

          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
              Didn't receive the email?
            </Typography>
            <Button
              variant="outlined"
              startIcon={resendLoading ? <CircularProgress size={20} /> : <Refresh />}
              onClick={handleResendEmail}
              disabled={!canResend || resendLoading}
              fullWidth
              sx={{
                borderColor: '#D4AF37',
                color: '#D4AF37',
                fontWeight: 600,
                py: 1.2,
                '&:hover': {
                  borderColor: '#D4AF37',
                  bgcolor: 'rgba(212, 175, 55, 0.1)',
                },
                '&:disabled': {
                  borderColor: '#666',
                  color: '#666',
                },
              }}
            >
              {resendLoading 
                ? 'Sending...' 
                : canResend 
                  ? 'Resend Verification Email' 
                  : `Resend in ${countdown}s`}
            </Button>
          </Box>

          <Box sx={{ pt: 3, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
              Need help?
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                onClick={() => navigate('/login')}
                sx={{
                  color: '#a0a0a0',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: '#D4AF37',
                    bgcolor: 'transparent',
                  },
                }}
              >
                Back to Login
              </Button>
              <Button
                onClick={() => navigate('/')}
                sx={{
                  color: '#a0a0a0',
                  textDecoration: 'underline',
                  '&:hover': {
                    color: '#D4AF37',
                    bgcolor: 'transparent',
                  },
                }}
              >
                Home
              </Button>
            </Box>
          </Box>

          <Alert 
            severity="warning" 
            sx={{ 
              mt: 4,
              bgcolor: 'rgba(255, 152, 0, 0.1)',
              color: '#ffb74d',
              border: '1px solid rgba(255, 152, 0, 0.3)',
              textAlign: 'left',
            }}
          >
            <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>
              <strong>Important:</strong> You must verify your email before you can upload scripts or access reports. 
              The verification link expires in 24 hours.
            </Typography>
          </Alert>
        </Paper>
      </Container>
    </Box>
  );
}
