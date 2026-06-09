import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { CheckCircle, Error as ErrorIcon, InfoOutlined, Launch } from '@mui/icons-material';
import { API_CONFIG, getAPIStatus } from '@/config/api.config';
import { apiFetch } from '@/services/api';

/**
 * API Connection Tester
 * Verifies frontend-to-backend connectivity and frontend-safe configuration only.
 */
export function APIConnectionTester() {
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [testing, setTesting] = useState(false);

  const apiStatus = getAPIStatus();

  const testBackend = async () => {
    setTesting(true);
    try {
      const response = await apiFetch('/api/health');
      if (!response.ok) {
        return { success: false, message: `Backend health check failed (${response.status})` };
      }
      const payload = await response.json();
      return {
        success: true,
        message: 'Backend reachable',
        details: payload?.status ? `Status: ${payload.status}` : 'Health endpoint OK',
      };
    } catch (error: any) {
      return { success: false, message: error.message || 'Backend request failed' };
    } finally {
      setTesting(false);
    }
  };

  const testStripe = async () => {
    setTesting(true);
    try {
      const key = API_CONFIG.stripe.publishableKey;
      if (!key) {
        return { success: false, message: 'No Stripe publishable key found' };
      }
      if (!key.startsWith('pk_')) {
        return { success: false, message: 'Invalid Stripe key format' };
      }
      const prices = API_CONFIG.stripe.prices;
      const hasPrices =
        prices.proMonthlyUSD || prices.proMonthlyGBP || prices.producerAnnualUSD || prices.producerAnnualGBP;

      return {
        success: true,
        message: `Stripe configured (${key.startsWith('pk_test') ? 'TEST' : 'LIVE'} mode)`,
        details: `Price IDs: ${hasPrices ? 'Configured' : 'Missing'}`,
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    } finally {
      setTesting(false);
    }
  };

  const testGoogleMaps = async () => {
    setTesting(true);
    try {
      const key = API_CONFIG.googleMaps.apiKey;
      if (!key) {
        return { success: false, message: 'No Google Maps key found' };
      }
      if (!key.startsWith('AIza')) {
        return { success: false, message: 'Google Maps key format looks invalid' };
      }
      return { success: true, message: 'Google Maps key configured' };
    } catch (error: any) {
      return { success: false, message: error.message };
    } finally {
      setTesting(false);
    }
  };

  const runTest = async (service: string, testFn: () => Promise<any>) => {
    setTesting(true);
    const result = await testFn();
    setTestResults((prev) => ({ ...prev, [service]: result }));
    setTesting(false);
  };

  const testAll = async () => {
    setTesting(true);
    const results = await Promise.all([testBackend(), testStripe(), testGoogleMaps()]);

    setTestResults({
      backend: results[0],
      stripe: results[1],
      googleMaps: results[2],
    });
    setTesting(false);
  };

  const getStatusChip = (active: boolean, tested?: any) => {
    if (tested === undefined) {
      return (
        <Chip
          size="small"
          label={active ? 'Configured' : 'Not Configured'}
          color={active ? 'info' : 'default'}
          variant={active ? 'filled' : 'outlined'}
        />
      );
    }

    if (tested.success) {
      return <Chip size="small" icon={<CheckCircle />} label="Working" color="success" />;
    }

    return <Chip size="small" icon={<ErrorIcon />} label="Failed" color="error" />;
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#000000', color: '#fff', p: 4 }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            API Connection Tester
          </Typography>
          <Typography sx={{ color: '#a0a0a0' }}>Validate backend first frontend integrations</Typography>
        </Box>

        <Card sx={{ mb: 3, bgcolor: '#1f1f1f', border: '1px solid #333' }}>
          <CardHeader
            title="Configuration Status"
            subheader="Only frontend safe values are checked here"
            slotProps={{ title: { sx: { color: '#fff' } }, subheader: { sx: { color: '#a0a0a0' } } }}
          />
          <CardContent>
            <Alert icon={<InfoOutlined />} severity="warning" sx={{ mb: 3 }}>
              <AlertTitle>Server side secrets</AlertTitle>
              Secret provider keys (OpenAI, backend service credentials, Stripe secret) are server side only and are
              intentionally not exposed in this page.
            </Alert>

            <Stack spacing={2}>
              {[
                {
                  key: 'backend',
                  title: 'Backend API',
                  description: 'FastAPI health and routing',
                  active: apiStatus.backend.active,
                  fn: testBackend,
                },
                {
                  key: 'stripe',
                  title: 'Stripe',
                  description: 'Checkout client configuration',
                  active: apiStatus.stripe.active,
                  fn: testStripe,
                },
                {
                  key: 'googleMaps',
                  title: 'Google Maps',
                  description: 'Frontend geospatial lookups',
                  active: apiStatus.googleMaps.active,
                  fn: testGoogleMaps,
                },
              ].map((item) => (
                <Box
                  key={item.key}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    bgcolor: '#111',
                    borderRadius: 1,
                    border: '1px solid #2a2a2a',
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>{item.title}</Typography>
                    <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                      {item.description}
                    </Typography>
                    {testResults[item.key] && (
                      <Typography variant="caption" sx={{ color: '#8a8a8a' }}>
                        {testResults[item.key].message}
                      </Typography>
                    )}
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {getStatusChip(item.active, testResults[item.key])}
                    <Button
                      variant="outlined"
                      onClick={() => runTest(item.key, item.fn)}
                      disabled={testing || !item.active}
                    >
                      Test
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
              <Button variant="contained" onClick={testAll} disabled={testing} fullWidth>
                {testing ? 'Testing...' : 'Test All Connections'}
              </Button>
              <Button variant="outlined" onClick={() => setTestResults({})}>
                Clear Results
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Card sx={{ mb: 3, bgcolor: '#1f1f1f', border: '1px solid #333' }}>
          <CardHeader title="Frontend Env Example" slotProps={{ title: { sx: { color: '#fff' } } }} />
          <CardContent>
            <Box sx={{ bgcolor: '#111', borderRadius: 1, p: 2, mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                Add to .env.local:
              </Typography>
              <Typography
                component="pre"
                sx={{
                  mt: 1,
                  fontSize: 12,
                  color: '#d0d0d0',
                  overflowX: 'auto',
                  m: 0,
                  fontFamily: 'monospace',
                }}
              >{`VITE_API_BASE_URL=http://localhost:8000
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
VITE_STRIPE_PRICE_PRO_MONTHLY_USD=price_xxx
VITE_STRIPE_PRICE_PRO_MONTHLY_GBP=price_xxx
VITE_STRIPE_PRICE_PRODUCER_ANNUAL_USD=price_xxx
VITE_STRIPE_PRICE_PRODUCER_ANNUAL_GBP=price_xxx
VITE_GOOGLE_MAPS_API_KEY=AIza...`}</Typography>
            </Box>
            <Alert severity="info">
              After updating env vars, restart your dev server (<code>npm run dev</code>).
            </Alert>
          </CardContent>
        </Card>

        <Card sx={{ bgcolor: '#1f1f1f', border: '1px solid #333' }}>
          <CardHeader title="Quick Links" slotProps={{ title: { sx: { color: '#fff' } } }} />
          <CardContent>
            <Grid container spacing={2}>
              {[
                { label: 'Stripe Dashboard', href: 'https://dashboard.stripe.com' },
                { label: 'Google Cloud Console', href: 'https://console.cloud.google.com' },
                { label: 'Backend API Docs', href: 'http://localhost:8000/api/docs' },
                { label: 'Integration Guide', href: '/BACKEND_INTEGRATION_GUIDE.md' },
              ].map((item) => (
                <Grid size={{ xs: 12, sm: 6 }} key={item.label}>
                  <Link
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    underline="none"
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      bgcolor: '#111',
                      border: '1px solid #2a2a2a',
                      borderRadius: 1,
                      color: '#ddd',
                      '&:hover': { bgcolor: '#1a1a1a' },
                    }}
                  >
                    {item.label}
                    <Launch sx={{ fontSize: 16 }} />
                  </Link>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

export default APIConnectionTester;
