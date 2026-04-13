import { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Alert,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Link,
  Button,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';

export function UserSignup() {
  const navigate = useNavigate();
  const { userSignup, googleLogin } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    accountType: 'company', // 'company' or 'individual'
    company: '',
    role: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (field: string) => (e: any) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      const success = await userSignup(formData);
      
      if (success) {
        // Redirect to email verification screen instead of dashboard
        navigate('/verify-email', { state: { email: formData.email } });
      } else {
        setError('An error occurred during signup. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    try {
      const success = await googleLogin();

      if (success) {
        navigate('/dashboard');
      } else {
        setError('Google sign-up failed. Please try again.');
      }
    } catch (_err) {
      setError('Google sign-up failed. Please try again.');
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
            p: { xs: 3, sm: 6 },
            bgcolor: '#0a0a0a',
            border: '2px solid rgba(212, 175, 55, 0.3)',
            borderRadius: 3,
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              <img 
                src={exampleLogo} 
                alt="Prodculator" 
                style={{ height: '48px', width: 'auto' }}
              />
            </Box>
            <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700, mb: 1 }}>
              Create Account
            </Typography>
            <Typography variant="body1" sx={{ color: '#a0a0a0' }}>
              Get started with Prodculator
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
              label="Full Name"
              value={formData.name}
              onChange={handleChange('name')}
              required
              sx={{ mb: 3 }}
            />

            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              required
              autoComplete="email"
              sx={{ mb: 3 }}
            />

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Account Type</InputLabel>
              <Select
                value={formData.accountType}
                onChange={handleChange('accountType')}
                label="Account Type"
                required
              >
                <MenuItem value="company">Company / Production Company</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
              </Select>
            </FormControl>

            {formData.accountType === 'company' && (
              <TextField
                fullWidth
                label="Company / Production Company Name"
                value={formData.company}
                onChange={handleChange('company')}
                required
                sx={{ mb: 3 }}
              />
            )}

            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={handleChange('role')}
                label="Role"
              >
                {/* Executive & Decision Makers */}
                <MenuItem disabled sx={{ color: '#D4AF37', fontWeight: 600, fontSize: '0.75rem' }}>
                  EXECUTIVE & DECISION MAKERS
                </MenuItem>
                <MenuItem value="executive_producer">Executive Producer</MenuItem>
                <MenuItem value="producer">Producer</MenuItem>
                <MenuItem value="investor">Investor</MenuItem>
                <MenuItem value="commissioning_editor">Commissioning Editor</MenuItem>
                <MenuItem value="studio_executive">Studio/Network Executive</MenuItem>
                
                {/* Creative Leadership */}
                <MenuItem disabled sx={{ color: '#D4AF37', fontWeight: 600, fontSize: '0.75rem', mt: 1 }}>
                  CREATIVE LEADERSHIP
                </MenuItem>
                <MenuItem value="director">Director</MenuItem>
                <MenuItem value="writer">Writer / Showrunner</MenuItem>
                
                {/* Production Management */}
                <MenuItem disabled sx={{ color: '#D4AF37', fontWeight: 600, fontSize: '0.75rem', mt: 1 }}>
                  PRODUCTION MANAGEMENT
                </MenuItem>
                <MenuItem value="line_producer">Line Producer</MenuItem>
                <MenuItem value="production_manager">Production Manager</MenuItem>
                <MenuItem value="upm">Unit Production Manager (UPM)</MenuItem>
                
                {/* Other */}
                <MenuItem disabled sx={{ color: '#D4AF37', fontWeight: 600, fontSize: '0.75rem', mt: 1 }}>
                  OTHER
                </MenuItem>
                <MenuItem value="development_executive">Development Executive</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              required
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
              helperText="Minimum 8 characters"
            />

            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              sx={{ mb: 3 }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      sx={{ color: '#a0a0a0' }}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  sx={{
                    color: '#D4AF37',
                    '&.Mui-checked': {
                      color: '#D4AF37',
                    },
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                  I agree to the{' '}
                  <Link 
                    component={RouterLink}
                    to="/terms" 
                    sx={{ color: '#D4AF37', textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/terms', '_blank');
                    }}
                  >
                    Terms of Service
                  </Link>
                  {' '}and{' '}
                  <Link 
                    component={RouterLink}
                    to="/privacy" 
                    sx={{ color: '#D4AF37', textDecoration: 'underline', cursor: 'pointer' }}
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('/privacy', '_blank');
                    }}
                  >
                    Privacy Policy
                  </Link>
                </Typography>
              }
              sx={{ mb: 4 }}
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </Box>

          <Divider sx={{ my: 3, borderColor: 'rgba(212, 175, 55, 0.2)' }}>
            <Typography variant="body2" sx={{ color: '#666', px: 1 }}>
              or
            </Typography>
          </Divider>

          <Button
            fullWidth
            variant="outlined"
            size="large"
            disabled={loading}
            onClick={handleGoogleSignUp}
            startIcon={
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
            }
            sx={{
              borderColor: '#333',
              color: '#FFFFFF',
              fontWeight: 600,
              py: 1.5,
              fontSize: '1rem',
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212, 175, 55, 0.05)',
              },
              '&:disabled': {
                borderColor: '#333',
                color: '#666',
              },
            }}
          >
            Sign up with Google
          </Button>

          <Divider sx={{ my: 4, borderColor: 'rgba(212, 175, 55, 0.2)' }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 2 }}>
              Already have an account?
            </Typography>
            <Button
              component={RouterLink}
              to="/login"
              variant="outlined"
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
              ← Back to Home
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}