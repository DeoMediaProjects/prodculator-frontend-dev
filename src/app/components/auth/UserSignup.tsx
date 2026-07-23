import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router';
import {
  Box,
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
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { AuthLayout } from '@/app/components/auth/AuthLayout';
import logoMark from '@/assets/prodculator-logo-white.png';

export function UserSignup() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userSignup, googleLogin } = useAuth();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  // ProtectedRoute redirects here (via /login) with the page the user was
  // actually trying to reach — send them back there instead of /dashboard.
  const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from;
  const redirectTo = from ? `${from.pathname}${from.search || ''}` : '/dashboard';
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
      const { status, error: signupError } = await userSignup(formData);

      if (status === 'verification_required') {
        navigate('/verify-email', { state: { email: formData.email } });
      } else if (status === 'success') {
        navigate(redirectTo);
      } else {
        setError(signupError || 'An error occurred during signup. Please try again.');
      }
    } catch {
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
        navigate(redirectTo);
      } else {
        setError('Google sign up failed. Please try again.');
      }
    } catch (_err) {
      setError('Google sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3 }}>
          <img
            src={logoMark}
            alt="Prodculator"
            style={{ height: '34px', width: 'auto', filter: mode === 'light' ? 'invert(1)' : 'none' }}
          />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Create account
        </Typography>
        <Typography variant="body1" sx={{ color: t.textPrimary }}>
          Get started with Prodculator
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          border: `1px solid ${t.border}`,
          borderRadius: 3,
        }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 2.5 }}>
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
            sx={{ mb: 2.25 }}
          />

          <TextField
            fullWidth
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            required
            autoComplete="email"
            sx={{ mb: 2.25 }}
          />

          {/* Account type + company name share a row when a company is selected */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2.25 }}>
            <FormControl fullWidth>
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
                label="Company Name"
                value={formData.company}
                onChange={handleChange('company')}
                required
              />
            )}
          </Box>

          <FormControl fullWidth sx={{ mb: 2.25 }}>
            <InputLabel>Role</InputLabel>
            <Select
              value={formData.role}
              onChange={handleChange('role')}
              label="Role"
            >
              {/* Executive & Decision Makers */}
              <MenuItem disabled sx={{ color: t.gold, fontWeight: 600, fontSize: '0.75rem', opacity: '1 !important' }}>
                EXECUTIVE & DECISION MAKERS
              </MenuItem>
              <MenuItem value="executive_producer">Executive Producer</MenuItem>
              <MenuItem value="producer">Producer</MenuItem>
              <MenuItem value="investor">Investor</MenuItem>
              <MenuItem value="commissioning_editor">Commissioning Editor</MenuItem>
              <MenuItem value="studio_executive">Studio/Network Executive</MenuItem>

              {/* Creative Leadership */}
              <MenuItem disabled sx={{ color: t.gold, fontWeight: 600, fontSize: '0.75rem', mt: 1, opacity: '1 !important' }}>
                CREATIVE LEADERSHIP
              </MenuItem>
              <MenuItem value="director">Director</MenuItem>
              <MenuItem value="writer">Writer / Showrunner</MenuItem>

              {/* Production Management */}
              <MenuItem disabled sx={{ color: t.gold, fontWeight: 600, fontSize: '0.75rem', mt: 1, opacity: '1 !important' }}>
                PRODUCTION MANAGEMENT
              </MenuItem>
              <MenuItem value="line_producer">Line Producer</MenuItem>
              <MenuItem value="production_manager">Production Manager</MenuItem>
              <MenuItem value="upm">Unit Production Manager (UPM)</MenuItem>

              {/* Other */}
              <MenuItem disabled sx={{ color: t.gold, fontWeight: 600, fontSize: '0.75rem', mt: 1, opacity: '1 !important' }}>
                OTHER
              </MenuItem>
              <MenuItem value="development_executive">Development Executive</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          {/* Password + confirm share a row on wider viewports */}
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, mb: 2.25 }}>
            <TextField
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              required
              helperText="Minimum 8 characters"
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

            <TextField
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              helperText=" "
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      edge="end"
                      sx={{ color: t.textSecondary }}
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={agreeToTerms}
                onChange={(e) => setAgreeToTerms(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ color: t.textPrimary }}>
                I agree to the{' '}
                <Link
                  component={RouterLink}
                  to="/terms"
                  sx={{ color: t.gold, textDecoration: 'underline', cursor: 'pointer' }}
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
                  sx={{ color: t.gold, textDecoration: 'underline', cursor: 'pointer' }}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open('/privacy', '_blank');
                  }}
                >
                  Privacy Policy
                </Link>
              </Typography>
            }
            sx={{ mb: 2.5 }}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ py: 1.4, fontSize: '1rem' }}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </Box>

        <Divider sx={{ my: 2.5 }}>
          <Typography variant="body2" sx={{ color: t.textPrimary, fontWeight: 500, px: 1 }}>
            or continue with
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
          sx={{ py: 1.4 }}
        >
          Sign up with Google
        </Button>

        <Typography variant="body2" sx={{ color: t.textPrimary, textAlign: 'center', mt: 3 }}>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" state={location.state} sx={{ color: t.gold, fontWeight: 600 }}>
            Sign in
          </Link>
        </Typography>
      </Paper>
    </AuthLayout>
  );
}
