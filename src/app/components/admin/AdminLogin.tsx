import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
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
} from '@mui/material';
import { Visibility, VisibilityOff, AdminPanelSettings } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';

export function AdminLogin() {
  const navigate = useNavigate();
  const { adminLogin, isAdminAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAdminAuthenticated) {
      navigate('/admin/overview');
    }
  }, [isAdminAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await adminLogin(email, password);
      
      if (success) {
        navigate('/admin/overview');
      } else {
        setError('Invalid credentials. Please check your email and password.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
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
      }}
    >
      {loading && <LoadingSpinner overlay message="Signing in..." />}
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
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <AdminPanelSettings
              sx={{
                fontSize: 64,
                color: '#D4AF37',
                mb: 2,
              }}
            />
            <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700, mb: 1 }}>
              Admin Portal
            </Typography>
            <Typography variant="body1" sx={{ color: '#a0a0a0' }}>
              Prodculator
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                bgcolor: 'rgba(244, 67, 54, 0.1)',
                color: '#f44336',
                border: '1px solid rgba(244, 67, 54, 0.3)',
              }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Admin Email"
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
              sx={{ mb: 4 }}
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

            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{
                bgcolor: '#D4AF37',
                color: '#000000',
                fontWeight: 700,
                py: 1.5,
                fontSize: '1.1rem',
                '&:hover': {
                  bgcolor: '#D4AF37',
                },
                '&:disabled': {
                  bgcolor: '#666',
                  color: '#a0a0a0',
                },
              }}
            >
              Sign In
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
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
              ← Back to Main Site
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}