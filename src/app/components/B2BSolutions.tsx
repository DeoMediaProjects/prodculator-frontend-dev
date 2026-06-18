import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSnackbar } from 'notistack';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  ArrowBack,
  CheckCircle,
  CloudDownload,
  CreditCard,
  Description,
  Send,
} from '@mui/icons-material';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import { useAuth } from '@/app/contexts/AuthContext';
import {
  b2bService,
  type B2BCurrency,
  type B2BDeliveryFrequency,
  type B2BIntelligenceRequest,
  type B2BProduct,
  type B2BSubscription,
} from '@/services/b2b.service';

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultStartDate() {
  const value = new Date();
  value.setMonth(value.getMonth() - 3);
  return dateInput(value);
}

function money(product: B2BProduct) {
  if (!product.self_service) return 'Custom contract';
  const gbp = product.price_gbp_cents ? `£${(product.price_gbp_cents / 100).toLocaleString('en-GB')}` : null;
  const usd = product.price_usd_cents ? `$${(product.price_usd_cents / 100).toLocaleString('en-US')}` : null;
  return [gbp, usd].filter(Boolean).join(' / ') + '/month';
}

function isActive(subscription?: B2BSubscription) {
  return !!subscription && ['active', 'trialing'].includes(subscription.status);
}

export function B2BSolutions() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<B2BSubscription[]>([]);
  const [requests, setRequests] = useState<B2BIntelligenceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<B2BProduct | null>(null);
  const [modalMode, setModalMode] = useState<'checkout' | 'request'>('checkout');
  const [currency, setCurrency] = useState<B2BCurrency>('gbp');
  const [deliveryFrequency, setDeliveryFrequency] = useState<B2BDeliveryFrequency>('monthly');
  const [extraRecipient, setExtraRecipient] = useState('');
  const [periodStart, setPeriodStart] = useState(defaultStartDate());
  const [periodEnd, setPeriodEnd] = useState(dateInput(new Date()));
  const [submitting, setSubmitting] = useState(false);

  const subscriptionsByProduct = useMemo(() => {
    const map = new Map<string, B2BSubscription>();
    subscriptions.forEach((subscription) => {
      if (isActive(subscription)) map.set(subscription.product_type, subscription);
    });
    return map;
  }, [subscriptions]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [productRows, subscriptionRows, requestRows] = await Promise.all([
        b2bService.getProducts(),
        b2bService.getSubscriptions(),
        b2bService.getRequests(),
      ]);
      setProducts(productRows);
      setSubscriptions(subscriptionRows);
      setRequests(requestRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load B2B intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openProduct = (product: B2BProduct) => {
    const active = subscriptionsByProduct.get(product.product_type);
    if (active) {
      setModalMode('request');
      setDeliveryFrequency((active.delivery_frequency as B2BDeliveryFrequency) || 'monthly');
      setExtraRecipient(active.extra_recipient_email || '');
    } else {
      if (!product.self_service) {
        enqueueSnackbar('Enterprise B2B access is admin/manual-contract only.', { variant: 'info' });
        return;
      }
      setModalMode('checkout');
      setDeliveryFrequency('monthly');
      setExtraRecipient('');
    }
    setSelectedProduct(product);
  };

  const closeModal = () => {
    if (submitting) return;
    setSelectedProduct(null);
    setExtraRecipient('');
    setPeriodStart(defaultStartDate());
    setPeriodEnd(dateInput(new Date()));
  };

  const submitCheckout = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      const response = await b2bService.createCheckout({
        product_type: selectedProduct.product_type,
        currency,
        delivery_frequency: deliveryFrequency,
        extra_recipient_email: extraRecipient || null,
      });
      window.location.assign(response.url);
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to start checkout', { variant: 'error' });
      setSubmitting(false);
    }
  };

  const submitRequest = async () => {
    if (!selectedProduct) return;
    setSubmitting(true);
    try {
      await b2bService.createRequest({
        product_type: selectedProduct.product_type,
        period_start: periodStart,
        period_end: periodEnd,
        extra_recipient_email: extraRecipient || null,
      });
      enqueueSnackbar('B2B intelligence request queued. The PDF will be emailed when ready.', { variant: 'success' });
      setSelectedProduct(null);
      setExtraRecipient('');
      setPeriodStart(defaultStartDate());
      setPeriodEnd(dateInput(new Date()));
      await load();
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Failed to request intelligence', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const download = async (request: B2BIntelligenceRequest) => {
    try {
      await b2bService.downloadRequestPdf(request);
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Download failed', { variant: 'error' });
    }
  };

  return (
    <Box sx={{ bgcolor: '#F8F6F0', minHeight: '100vh', fontFamily: "'Montserrat', sans-serif" }}>
      <Box sx={{ bgcolor: '#fff', borderBottom: '1px solid rgba(0,0,0,0.1)', py: 2 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <img
              src={exampleLogo}
              alt="Prodculator"
              style={{ height: 32, width: 'auto', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            />
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/dashboard')} sx={{ color: '#000' }}>
              Dashboard
            </Button>
          </Box>
        </Container>
      </Box>

      <Box sx={{ bgcolor: '#050505', py: 6 }}>
        <Container maxWidth="md">
          <Typography sx={{ color: '#fff', fontSize: { xs: 34, md: 44 }, fontWeight: 800, textAlign: 'center', mb: 2 }}>
            B2B Production Intelligence
          </Typography>
          <Typography sx={{ color: '#bbb', fontSize: 17, textAlign: 'center', lineHeight: 1.7 }}>
            Subscribe to a product, select a custom reporting period, and receive anonymised aggregate intelligence as a PDF.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 5 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: '#D4AF37' }} />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {products.map((product) => {
                const active = subscriptionsByProduct.get(product.product_type);
                return (
                  <Card key={product.product_type} sx={{ bgcolor: '#fff', color: '#111', p: 3, borderRadius: 2, boxShadow: '0 2px 16px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column' }}>
                    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
                      {active && <Chip size="small" label="Active" sx={{ bgcolor: '#1A8C4E', color: '#fff' }} />}
                      {!product.self_service && <Chip size="small" label="Manual contract" />}
                    </Stack>
                    <Typography sx={{ fontSize: 21, fontWeight: 800, mb: 1 }}>{product.title}</Typography>
                    <Typography sx={{ color: '#1A8C4E', fontWeight: 700, mb: 2 }}>{product.audience}</Typography>
                    <Typography sx={{ color: '#555', lineHeight: 1.6, mb: 2 }}>{product.description}</Typography>
                    <Typography sx={{ color: '#D4AF37', fontWeight: 800, mb: 1 }}>Key Metrics:</Typography>
                    <Stack spacing={1.1} sx={{ mb: 3 }}>
                      {product.features.map((feature) => (
                        <Stack direction="row" spacing={1.2} key={feature} alignItems="flex-start">
                          <CheckCircle sx={{ color: '#1A8C4E', fontSize: 18, mt: '2px' }} />
                          <Typography sx={{ color: '#333', fontSize: 14 }}>{feature}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    <Box sx={{ mt: 'auto' }}>
                      <Typography sx={{ color: '#111', fontSize: 26, fontWeight: 900, textAlign: 'right', mb: 2 }}>
                        {money(product)}
                      </Typography>
                      <Button
                        fullWidth
                        startIcon={active ? <Description /> : <CreditCard />}
                        onClick={() => openProduct(product)}
                        disabled={!product.self_service && !active}
                        sx={{ height: 48, border: '2px solid rgba(212,175,55,0.55)', color: '#B8941F', fontWeight: 800 }}
                      >
                        {active ? 'Generate PDF' : product.self_service ? 'Subscribe' : 'Admin managed'}
                      </Button>
                    </Box>
                  </Card>
                );
              })}
            </Box>

            <Box sx={{ mt: 6, bgcolor: '#fff', borderRadius: 2, p: 3, color: '#111' }}>
              <Typography sx={{ fontSize: 24, fontWeight: 800, mb: 1 }}>Request History</Typography>
              <Typography sx={{ color: '#666', mb: 2 }}>Paid B2B users can download completed PDF intelligence requests here.</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell>Period</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Requested</TableCell>
                      <TableCell align="right">PDF</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {requests.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5}>No B2B intelligence requests yet.</TableCell>
                      </TableRow>
                    ) : requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{products.find((p) => p.product_type === request.product_type)?.title || request.product_type}</TableCell>
                        <TableCell>{request.period_start} to {request.period_end}</TableCell>
                        <TableCell><Chip size="small" label={request.status} /></TableCell>
                        <TableCell>{new Date(request.created_at).toLocaleDateString()}</TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            startIcon={<CloudDownload />}
                            disabled={request.status !== 'completed'}
                            onClick={() => download(request)}
                          >
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </>
        )}
      </Container>

      <Dialog open={!!selectedProduct} onClose={closeModal} fullWidth maxWidth="sm">
        <DialogTitle>{selectedProduct?.title}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Alert severity="info">
              Primary recipient: {user?.email}
            </Alert>
            <TextField
              label="Extra recipient (optional, capped at 1)"
              value={extraRecipient}
              onChange={(event) => setExtraRecipient(event.target.value)}
              placeholder="finance@example.com"
              fullWidth
            />
            {modalMode === 'checkout' ? (
              <>
                <TextField select label="Billing currency" value={currency} onChange={(event) => setCurrency(event.target.value as B2BCurrency)}>
                  <MenuItem value="gbp">GBP</MenuItem>
                  <MenuItem value="usd">USD</MenuItem>
                </TextField>
                <TextField select label="Auto-delivery cadence" value={deliveryFrequency} onChange={(event) => setDeliveryFrequency(event.target.value as B2BDeliveryFrequency)}>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </TextField>
              </>
            ) : (
              <>
                <Divider />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Start date"
                    type="date"
                    value={periodStart}
                    onChange={(event) => setPeriodStart(event.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="End date"
                    type="date"
                    value={periodEnd}
                    onChange={(event) => setPeriodEnd(event.target.value)}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={closeModal} disabled={submitting}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={modalMode === 'checkout' ? <CreditCard /> : <Send />}
            onClick={modalMode === 'checkout' ? submitCheckout : submitRequest}
            disabled={submitting}
          >
            {submitting ? 'Working...' : modalMode === 'checkout' ? 'Continue to payment' : 'Generate PDF'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
