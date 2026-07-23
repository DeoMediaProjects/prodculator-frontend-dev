import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  IconButton,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  CheckCircle,
  CloudDownload,
  CreditCard,
  Description,
  HourglassEmpty,
  History,
  Inbox,
  MailOutline,
  PictureAsPdf,
  Send,
  Visibility,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { useGeoCurrency } from '@/app/hooks/useGeoCurrency';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { PageHeader } from '@/app/components/common/PageHeader';
import { SiteFooter } from '@/app/components/common/SiteFooter';
import {
  b2bService,
  type B2BCurrency,
  type B2BDeliveryFrequency,
  type B2BIntelligenceRequest,
  type B2BProduct,
  type B2BProductType,
  type B2BSubscription,
} from '@/services/b2b.service';

const CURRENCY_META: Record<B2BCurrency, { symbol: string; locale: string }> = {
  gbp: { symbol: '£', locale: 'en-GB' },
  usd: { symbol: '$', locale: 'en-US' },
};

// Illustrative rows used only in the "sample report" preview. Section titles and
// shapes mirror the real per-product output of the backend's `build_metrics`
// (app/modules/b2b/service.py) rendered via the b2b_intelligence PDF template
// (Segment / Count / Share). `percentage: null` renders as "N/A", matching the
// template (used by the headcount section's mean/max rows).
interface SampleSection {
  title: string;
  summary: string;
  rows: { label: string; count: number; percentage: number | null }[];
}

const SAMPLE_SECTIONS_BY_PRODUCT: Record<B2BProductType, SampleSection[]> = {
  camera_equipment: [
    {
      title: 'Production Volume by Territory',
      summary: 'Share of anonymised production signals by primary shooting territory.',
      rows: [
        { label: 'United Kingdom', count: 214, percentage: 28.4 },
        { label: 'North America', count: 198, percentage: 26.3 },
        { label: 'Western Europe', count: 142, percentage: 18.9 },
        { label: 'Asia-Pacific', count: 121, percentage: 16.1 },
        { label: 'Other territories', count: 78, percentage: 10.3 },
      ],
    },
    {
      title: 'Camera & Equipment Mix',
      summary: 'Most frequently planned camera bodies and equipment packages.',
      rows: [
        { label: 'ARRI Alexa 35', count: 287, percentage: 24.1 },
        { label: 'RED V-Raptor', count: 201, percentage: 16.9 },
        { label: 'Sony Venice 2', count: 176, percentage: 14.8 },
        { label: 'Blackmagic URSA', count: 132, percentage: 11.1 },
        { label: 'Anamorphic lens package', count: 98, percentage: 8.2 },
      ],
    },
    {
      title: 'Production Type Distribution',
      summary: 'Distribution of signals across production formats.',
      rows: [
        { label: 'Feature Film', count: 246, percentage: 32.7 },
        { label: 'TV Series', count: 213, percentage: 28.3 },
        { label: 'Commercial', count: 154, percentage: 20.5 },
        { label: 'Short Film', count: 89, percentage: 11.8 },
        { label: 'Documentary', count: 51, percentage: 6.8 },
      ],
    },
    {
      title: 'Genre Mix',
      summary: 'Genre signals across anonymised production planning records.',
      rows: [
        { label: 'Drama', count: 198, percentage: 21.0 },
        { label: 'Thriller', count: 156, percentage: 16.6 },
        { label: 'Comedy', count: 134, percentage: 14.2 },
        { label: 'Sci-Fi', count: 112, percentage: 11.9 },
        { label: 'Horror', count: 98, percentage: 10.4 },
      ],
    },
    {
      title: 'Monthly Upload Volume',
      summary: 'Anonymised production signal volume by submission month.',
      rows: [
        { label: '2026-01', count: 241, percentage: 32.0 },
        { label: '2026-02', count: 268, percentage: 35.6 },
        { label: '2026-03', count: 244, percentage: 32.4 },
      ],
    },
  ],
  production_services: [
    {
      title: 'Crew Size Distribution',
      summary: 'Declared crew size banded across anonymised productions.',
      rows: [
        { label: '1–10', count: 142, percentage: 21.8 },
        { label: '11–25', count: 213, percentage: 32.7 },
        { label: '26–50', count: 176, percentage: 27.0 },
        { label: '51–100', count: 84, percentage: 12.9 },
        { label: '100+', count: 36, percentage: 5.5 },
      ],
    },
    {
      title: 'Total Headcount Trend Analysis',
      summary: 'Average declared headcount across anonymised productions: 42.7',
      rows: [
        { label: 'Signals with headcount metadata', count: 651, percentage: 86.4 },
        { label: 'Average declared headcount', count: 42.7, percentage: null },
        { label: 'Maximum declared headcount', count: 318, percentage: null },
      ],
    },
    {
      title: 'Budget Range Breakdown',
      summary: 'Distribution of production planning records across budget tiers.',
      rows: [
        { label: '£0 – 250k', count: 198, percentage: 26.3 },
        { label: '£250k – 1M', count: 213, percentage: 28.3 },
        { label: '£1M – 5M', count: 187, percentage: 24.9 },
        { label: '£5M – 20M', count: 102, percentage: 13.6 },
        { label: '£20M+', count: 52, percentage: 6.9 },
      ],
    },
    {
      title: 'Territory Demand Mix',
      summary: 'Share of anonymised production signals by primary shooting territory.',
      rows: [
        { label: 'United Kingdom', count: 224, percentage: 29.7 },
        { label: 'North America', count: 201, percentage: 26.7 },
        { label: 'Western Europe', count: 156, percentage: 20.7 },
        { label: 'Asia-Pacific', count: 98, percentage: 13.0 },
        { label: 'Other territories', count: 74, percentage: 9.8 },
      ],
    },
    {
      title: 'Format Distribution',
      summary: 'Distribution of signals across production formats.',
      rows: [
        { label: 'TV Series', count: 268, percentage: 35.6 },
        { label: 'Feature Film', count: 221, percentage: 29.4 },
        { label: 'Commercial', count: 142, percentage: 18.9 },
        { label: 'Short Film', count: 67, percentage: 8.9 },
        { label: 'Documentary', count: 54, percentage: 7.2 },
      ],
    },
  ],
  crew_casting: [
    {
      title: 'Principal Cast Demand',
      summary: 'Declared principal cast counts banded across anonymised productions.',
      rows: [
        { label: '1–3', count: 312, percentage: 41.4 },
        { label: '4–6', count: 234, percentage: 31.1 },
        { label: '7–10', count: 124, percentage: 16.5 },
        { label: '11+', count: 83, percentage: 11.0 },
      ],
    },
    {
      title: 'Supporting Cast Demand',
      summary: 'Declared supporting cast counts banded across anonymised productions.',
      rows: [
        { label: '1–5', count: 198, percentage: 26.3 },
        { label: '6–15', count: 287, percentage: 38.1 },
        { label: '16–30', count: 168, percentage: 22.3 },
        { label: '31+', count: 100, percentage: 13.3 },
      ],
    },
    {
      title: 'Extras Demand',
      summary: 'Declared background/extras counts banded across anonymised productions.',
      rows: [
        { label: '0–20', count: 221, percentage: 29.4 },
        { label: '21–100', count: 256, percentage: 34.0 },
        { label: '101–500', count: 178, percentage: 23.6 },
        { label: '500+', count: 98, percentage: 13.0 },
      ],
    },
    {
      title: 'Genre Mix',
      summary: 'Genre signals across anonymised production planning records.',
      rows: [
        { label: 'Drama', count: 212, percentage: 22.5 },
        { label: 'Comedy', count: 167, percentage: 17.7 },
        { label: 'Thriller', count: 145, percentage: 15.4 },
        { label: 'Period', count: 112, percentage: 11.9 },
        { label: 'Action', count: 98, percentage: 10.4 },
      ],
    },
    {
      title: 'Submission Timing Clusters',
      summary: 'Anonymised casting signal volume by submission month.',
      rows: [
        { label: '2026-01', count: 238, percentage: 31.6 },
        { label: '2026-02', count: 261, percentage: 34.7 },
        { label: '2026-03', count: 254, percentage: 33.7 },
      ],
    },
  ],
  production_trend: [
    {
      title: 'Territory Demand Distribution',
      summary: 'Share of anonymised production signals by primary shooting territory.',
      rows: [
        { label: 'North America', count: 268, percentage: 29.3 },
        { label: 'United Kingdom', count: 224, percentage: 24.5 },
        { label: 'Western Europe', count: 178, percentage: 19.5 },
        { label: 'Asia-Pacific', count: 142, percentage: 15.5 },
        { label: 'Other territories', count: 102, percentage: 11.2 },
      ],
    },
    {
      title: 'Budget Range Mix',
      summary: 'Distribution of production planning records across budget tiers.',
      rows: [
        { label: '£0 – 250k', count: 212, percentage: 23.2 },
        { label: '£250k – 1M', count: 256, percentage: 28.0 },
        { label: '£1M – 5M', count: 234, percentage: 25.6 },
        { label: '£5M+', count: 213, percentage: 23.3 },
      ],
    },
    {
      title: 'Genre Trend Signals',
      summary: 'Genre signals across anonymised production planning records.',
      rows: [
        { label: 'Drama', count: 198, percentage: 21.6 },
        { label: 'Thriller', count: 167, percentage: 18.3 },
        { label: 'Sci-Fi', count: 145, percentage: 15.9 },
        { label: 'Comedy', count: 132, percentage: 14.4 },
        { label: 'Horror', count: 112, percentage: 12.2 },
      ],
    },
    {
      title: 'Format Mix',
      summary: 'Distribution of signals across production formats.',
      rows: [
        { label: 'TV Series', count: 287, percentage: 31.4 },
        { label: 'Feature Film', count: 246, percentage: 26.9 },
        { label: 'Streaming Limited Series', count: 176, percentage: 19.3 },
        { label: 'Commercial', count: 121, percentage: 13.2 },
        { label: 'Short Film', count: 84, percentage: 9.2 },
      ],
    },
    {
      title: 'Monthly Planning Volume',
      summary: 'Anonymised production planning signal volume by month.',
      rows: [
        { label: '2026-01', count: 289, percentage: 31.6 },
        { label: '2026-02', count: 312, percentage: 34.1 },
        { label: '2026-03', count: 314, percentage: 34.3 },
      ],
    },
  ],
  // Enterprise reports fall through to the same `else` branch as production_trend
  // in the backend's build_metrics, so they share its section set.
  enterprise: [],
};

function sampleSectionsFor(productType: B2BProductType): SampleSection[] {
  const sections = SAMPLE_SECTIONS_BY_PRODUCT[productType];
  return sections.length ? sections : SAMPLE_SECTIONS_BY_PRODUCT.production_trend;
}

// Illustrative reporting window shown in the preview only.
const SAMPLE_PERIOD = { start: '2026-01-01', end: '2026-03-31' };

function dateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultStartDate() {
  const value = new Date();
  value.setMonth(value.getMonth() - 3);
  return dateInput(value);
}

// Format both full ISO timestamps and date-only strings without timezone drift.
function formatDay(value: string) {
  const parsed = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value);
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function priceAmount(product: B2BProduct, currency: B2BCurrency): string | null {
  const primaryCents = currency === 'gbp' ? product.price_gbp_cents : product.price_usd_cents;
  if (primaryCents != null) {
    const meta = CURRENCY_META[currency];
    return `${meta.symbol}${(primaryCents / 100).toLocaleString(meta.locale)}`;
  }
  // Fall back to the other currency if the selected one isn't configured.
  const altCurrency: B2BCurrency = currency === 'gbp' ? 'usd' : 'gbp';
  const altCents = altCurrency === 'gbp' ? product.price_gbp_cents : product.price_usd_cents;
  if (altCents != null) {
    const meta = CURRENCY_META[altCurrency];
    return `${meta.symbol}${(altCents / 100).toLocaleString(meta.locale)}`;
  }
  return null;
}

function money(product: B2BProduct, currency: B2BCurrency) {
  if (!product.self_service) return 'Custom contract';
  const amount = priceAmount(product, currency);
  return amount ? `${amount}/month` : 'Contact us';
}

function isActive(subscription?: B2BSubscription) {
  return !!subscription && ['active', 'trialing'].includes(subscription.status);
}

export function B2BSolutions() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { isUK } = useGeoCurrency();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const REQUEST_STATUS: Record<string, { label: string; color: string; bg: string }> = {
    completed: { label: 'Completed', color: t.success, bg: alpha(t.success, 0.12) },
    processing: { label: 'Processing', color: t.gold, bg: t.goldDim },
    failed: { label: 'Failed', color: t.error, bg: alpha(t.error, 0.12) },
  };
  const statusMeta = (status: string) => REQUEST_STATUS[status] || { label: status, color: t.textSecondary, bg: t.borderSoft };

  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<B2BSubscription[]>([]);
  const [requests, setRequests] = useState<B2BIntelligenceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<B2BProduct | null>(null);
  const [previewProduct, setPreviewProduct] = useState<B2BProduct | null>(null);
  const [modalMode, setModalMode] = useState<'checkout' | 'request'>('checkout');
  const [currency, setCurrency] = useState<B2BCurrency>('gbp');
  const currencyTouched = useRef(false);
  const [deliveryFrequency, setDeliveryFrequency] = useState<B2BDeliveryFrequency>('monthly');
  const [extraRecipient, setExtraRecipient] = useState('');
  const [periodStart, setPeriodStart] = useState(defaultStartDate());
  const [periodEnd, setPeriodEnd] = useState(dateInput(new Date()));
  const [submitting, setSubmitting] = useState(false);

  // Seed currency from geo-detection (resolves async); stop syncing once the user picks one.
  useEffect(() => {
    if (!currencyTouched.current) setCurrency(isUK ? 'gbp' : 'usd');
  }, [isUK]);

  const changeCurrency = (next: B2BCurrency) => {
    currencyTouched.current = true;
    setCurrency(next);
  };

  const subscriptionsByProduct = useMemo(() => {
    const map = new Map<string, B2BSubscription>();
    subscriptions.forEach((subscription) => {
      if (isActive(subscription)) map.set(subscription.product_type, subscription);
    });
    return map;
  }, [subscriptions]);

  const productTitle = (request: B2BIntelligenceRequest) =>
    products.find((p) => p.product_type === request.product_type)?.title || request.product_type;

  const load = useCallback(async () => {
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
  }, []);

  // Route-level ProtectedRoute guarantees an authenticated session before this
  // component ever mounts, so we always load real data — no anonymous fallback.
  useEffect(() => {
    void load();
  }, [load]);

  const openProduct = (product: B2BProduct) => {
    const active = subscriptionsByProduct.get(product.product_type);
    if (active) {
      setModalMode('request');
      setDeliveryFrequency((active.delivery_frequency as B2BDeliveryFrequency) || 'monthly');
      setExtraRecipient(active.extra_recipient_email || '');
    } else {
      if (!product.self_service) {
        // Enterprise/manual-contract products aren't self-serve — route the
        // prospect to the contact form pre-set to a sales enquiry instead of
        // dead-ending on a disabled button.
        navigate('/contact?type=sales');
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

  const renderDownload = (request: B2BIntelligenceRequest, fullWidth = false) => {
    if (request.status === 'completed') {
      return (
        <Button size="small" variant="contained" fullWidth={fullWidth} startIcon={<CloudDownload />} onClick={() => download(request)}>
          Download
        </Button>
      );
    }
    if (request.status === 'failed') {
      return <Typography sx={{ color: t.error, fontSize: 13, fontWeight: 600 }}>Generation failed</Typography>;
    }
    return (
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent={fullWidth ? 'flex-start' : 'flex-end'} sx={{ color: t.textFaint }}>
        <HourglassEmpty sx={{ fontSize: 15 }} />
        <Typography sx={{ fontSize: 13 }}>Preparing…</Typography>
      </Stack>
    );
  };

  const previewRecipient = user?.email || 'your account email';

  const currencyToggle = (
    <Stack direction="row" spacing={0} sx={{ bgcolor: t.inputBg, border: `1px solid ${t.border}`, borderRadius: 2, p: 0.25 }}>
      {(['gbp', 'usd'] as const).map((c) => (
        <Box
          key={c}
          onClick={() => changeCurrency(c)}
          sx={{
            px: 2, py: 0.75, borderRadius: 1.5, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
            color: currency === c ? (mode === 'dark' ? '#000' : '#fff') : t.textSecondary,
            bgcolor: currency === c ? t.gold : 'transparent',
          }}
        >
          {c === 'gbp' ? '£ GBP' : '$ USD'}
        </Box>
      ))}
    </Stack>
  );

  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh' }}>
      <PageHeader />

      <Box sx={{ borderBottom: `1px solid ${t.border}` }}>
        <Container maxWidth="md" sx={{ py: 6 }}>
          <Typography sx={{ color: t.textPrimary, fontSize: { xs: 34, md: 44 }, fontWeight: 800, textAlign: 'center', mb: 2 }}>
            B2B Production Intelligence
          </Typography>
          <Typography sx={{ color: t.textSecondary, fontSize: 17, textAlign: 'center', lineHeight: 1.7 }}>
            Subscribe to a product, select a custom reporting period, and receive anonymised aggregate intelligence as a PDF.
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 5 }}>
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress sx={{ color: t.gold }} />
          </Box>
        ) : (
          <>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'center', md: 'flex-end' }, alignItems: 'center', gap: 1.5, mb: 3 }}>
              <Typography sx={{ color: t.textSecondary, fontWeight: 600, fontSize: 14 }}>Prices shown in</Typography>
              {currencyToggle}
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {products.map((product) => {
                const active = subscriptionsByProduct.get(product.product_type);
                const amount = priceAmount(product, currency);
                return (
                  <Card
                    key={product.product_type}
                    elevation={0}
                    sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, p: 3, borderRadius: 2, display: 'flex', flexDirection: 'column' }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', flexGrow: 1 }}>
                        {active && <Chip size="small" label="Active" sx={{ bgcolor: t.success, color: '#fff' }} />}
                        {!product.self_service && <Chip size="small" label="Manual contract" sx={{ bgcolor: t.borderSoft, color: t.textSecondary }} />}
                      </Stack>
                      <Tooltip title="Preview a sample report">
                        <IconButton size="small" onClick={() => setPreviewProduct(product)} sx={{ color: t.gold, bgcolor: t.goldDim, '&:hover': { bgcolor: alpha(t.gold, 0.24) } }}>
                          <Visibility fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                    <Typography sx={{ fontSize: 21, fontWeight: 800, mb: 1, color: t.textPrimary }}>{product.title}</Typography>
                    <Typography sx={{ color: t.success, fontWeight: 700, mb: 2 }}>{product.audience}</Typography>
                    <Typography sx={{ color: t.textSecondary, lineHeight: 1.6, mb: 2 }}>{product.description}</Typography>
                    <Typography sx={{ color: t.gold, fontWeight: 800, mb: 1 }}>Key Metrics:</Typography>
                    <Stack spacing={1.1} sx={{ mb: 3 }}>
                      {product.features.map((feature) => (
                        <Stack direction="row" spacing={1.2} key={feature} alignItems="flex-start">
                          <CheckCircle sx={{ color: t.success, fontSize: 18, mt: '2px' }} />
                          <Typography sx={{ color: t.textPrimary, fontSize: 14 }}>{feature}</Typography>
                        </Stack>
                      ))}
                    </Stack>
                    <Box sx={{ mt: 'auto' }}>
                      <Box sx={{ textAlign: 'right', mb: 2, minHeight: 40 }}>
                        {!product.self_service ? (
                          <Typography sx={{ color: t.textPrimary, fontSize: 24, fontWeight: 900 }}>Custom contract</Typography>
                        ) : amount ? (
                          <Box sx={{ display: 'inline-flex', alignItems: 'baseline', gap: 0.5 }}>
                            <Typography component="span" sx={{ color: t.textPrimary, fontSize: 30, fontWeight: 900, lineHeight: 1 }}>
                              {amount}
                            </Typography>
                            <Typography component="span" sx={{ color: t.textFaint, fontSize: 15, fontWeight: 600 }}>
                              /month
                            </Typography>
                          </Box>
                        ) : (
                          <Typography sx={{ color: t.textPrimary, fontSize: 24, fontWeight: 900 }}>Contact us</Typography>
                        )}
                      </Box>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={active ? <Description /> : <CreditCard />}
                        onClick={() => openProduct(product)}
                        sx={{ height: 48 }}
                      >
                        {active ? 'Generate PDF' : product.self_service ? 'Subscribe' : 'Contact Sales'}
                      </Button>
                    </Box>
                  </Card>
                );
              })}
            </Box>

            <Box sx={{ mt: 6, bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 2, p: { xs: 2.5, md: 3 } }}>
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                <History sx={{ color: t.gold }} />
                <Typography sx={{ fontSize: 24, fontWeight: 800, color: t.textPrimary }}>Request History</Typography>
                {requests.length > 0 && (
                  <Chip size="small" label={requests.length} sx={{ bgcolor: t.goldDim, color: t.gold, fontWeight: 700 }} />
                )}
              </Stack>
              <Typography sx={{ color: t.textSecondary, mb: 3 }}>
                Download your completed PDF intelligence reports here.
              </Typography>

              {requests.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6, px: 2, border: `1px dashed ${t.border}`, borderRadius: 2 }}>
                  <Inbox sx={{ fontSize: 44, color: t.textFaint, mb: 1 }} />
                  <Typography sx={{ fontWeight: 700, mb: 0.5, color: t.textPrimary }}>No requests yet</Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: 14 }}>
                    Subscribe to a product and generate a report to see it here.
                  </Typography>
                </Box>
              ) : (
                <>
                  {/* Desktop / tablet table */}
                  <TableContainer sx={{ display: { xs: 'none', md: 'block' } }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, color: t.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `2px solid ${t.border}` } }}>
                          <TableCell>Product</TableCell>
                          <TableCell>Reporting period</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Requested</TableCell>
                          <TableCell align="right">PDF</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {requests.map((request) => {
                          const meta = statusMeta(request.status);
                          return (
                            <TableRow key={request.id} hover sx={{ '&:last-child td': { border: 0 }, '& td': { borderColor: t.borderSoft } }}>
                              <TableCell sx={{ fontWeight: 600, color: t.textPrimary }}>{productTitle(request)}</TableCell>
                              <TableCell sx={{ color: t.textSecondary }}>
                                {formatDay(request.period_start)} – {formatDay(request.period_end)}
                              </TableCell>
                              <TableCell>
                                <Chip size="small" label={meta.label} sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, textTransform: 'capitalize' }} />
                              </TableCell>
                              <TableCell sx={{ color: t.textSecondary }}>{formatDay(request.created_at)}</TableCell>
                              <TableCell align="right">{renderDownload(request)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {/* Mobile cards */}
                  <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
                    {requests.map((request) => {
                      const meta = statusMeta(request.status);
                      return (
                        <Box key={request.id} sx={{ border: `1px solid ${t.border}`, borderRadius: 2, p: 2 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1.5 }}>
                            <Typography sx={{ fontWeight: 700, color: t.textPrimary }}>{productTitle(request)}</Typography>
                            <Chip size="small" label={meta.label} sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, textTransform: 'capitalize' }} />
                          </Stack>
                          <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>
                            <strong>Period:</strong> {formatDay(request.period_start)} – {formatDay(request.period_end)}
                          </Typography>
                          <Typography sx={{ color: t.textSecondary, fontSize: 13, mb: 1.5 }}>
                            <strong>Requested:</strong> {formatDay(request.created_at)}
                          </Typography>
                          {renderDownload(request, true)}
                        </Box>
                      );
                    })}
                  </Stack>
                </>
              )}
            </Box>
          </>
        )}
      </Container>

      <SiteFooter />

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
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography sx={{ fontWeight: 600 }}>Billing currency</Typography>
                  {currencyToggle}
                </Stack>
                <TextField select label="Auto-delivery cadence" value={deliveryFrequency} onChange={(event) => setDeliveryFrequency(event.target.value as B2BDeliveryFrequency)}>
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                </TextField>
                {selectedProduct && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: t.cardBgAlt, borderRadius: 1.5 }}>
                    <Typography sx={{ color: t.textSecondary }}>Subscription</Typography>
                    <Typography sx={{ fontWeight: 800, fontSize: 18 }}>{money(selectedProduct, currency)}</Typography>
                  </Box>
                )}
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

      <Dialog open={!!previewProduct} onClose={() => setPreviewProduct(null)} fullWidth maxWidth="md" scroll="body">
        {previewProduct && (
          <>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Visibility sx={{ color: t.gold }} />
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 20 }}>Sample report preview</Typography>
                  <Typography sx={{ color: t.textSecondary, fontSize: 14 }}>{previewProduct.title}</Typography>
                </Box>
              </Stack>
            </DialogTitle>
            <DialogContent dividers sx={{ bgcolor: t.cardBgAlt }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Illustrative example only. Actual figures reflect your selected reporting period and live anonymised platform data.
              </Alert>

              <Typography sx={{ fontWeight: 700, color: t.textFaint, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5, mb: 1 }}>
                1. The email you'll receive
              </Typography>
              <Box sx={{ bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: 2, p: 2.5, mb: 4 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.5 }}>
                  <MailOutline sx={{ color: t.success }} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>Your B2B intelligence PDF is ready</Typography>
                    <Typography sx={{ color: t.textFaint, fontSize: 13, wordBreak: 'break-all' }}>to {previewRecipient}</Typography>
                  </Box>
                </Stack>
                <Divider sx={{ mb: 1.5 }} />
                <Typography sx={{ fontSize: 14, mb: 1.5 }}>
                  Your <strong>{previewProduct.title}</strong> report for {formatDay(SAMPLE_PERIOD.start)} – {formatDay(SAMPLE_PERIOD.end)} is attached as a PDF.
                </Typography>
                <Chip
                  icon={<PictureAsPdf />}
                  label={`${previewProduct.product_type}-${SAMPLE_PERIOD.start}-${SAMPLE_PERIOD.end}.pdf`}
                  sx={{ bgcolor: alpha(t.error, 0.08), color: t.error, fontWeight: 600, '& .MuiChip-icon': { color: t.error } }}
                />
              </Box>

              <Typography sx={{ fontWeight: 700, color: t.textFaint, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.5, mb: 1 }}>
                2. The attached PDF
              </Typography>
              <Box sx={{ bgcolor: t.cardBg, borderRadius: 1, border: `1px solid ${t.border}`, p: { xs: 2.5, md: 5 } }}>
                <Typography sx={{ fontSize: { xs: 22, md: 26 }, fontWeight: 800, mb: 1, color: t.textPrimary }}>{previewProduct.title}</Typography>
                <Typography sx={{ color: t.textSecondary, fontSize: 13, mb: 2 }}>
                  Period: {formatDay(SAMPLE_PERIOD.start)} to {formatDay(SAMPLE_PERIOD.end)}<br />
                  Generated: {formatDay(new Date().toISOString())}<br />
                  Source signals: 914
                </Typography>
                <Box sx={{ bgcolor: t.goldDim, border: `1px solid ${t.gold}`, p: 1.5, borderRadius: 1, fontSize: 13, color: t.textPrimary, mb: 3 }}>
                  This report uses anonymised aggregate platform metadata. Customer-facing output requires at least 10 total signals and 5 signals per displayed segment.
                </Box>

                <Typography sx={{ color: t.gold, fontWeight: 800, fontSize: 14, mb: 1 }}>Included in this report</Typography>
                <Stack spacing={0.75} sx={{ mb: 3 }}>
                  {previewProduct.features.map((feature) => (
                    <Stack direction="row" spacing={1} key={feature} alignItems="flex-start">
                      <CheckCircle sx={{ color: t.success, fontSize: 16, mt: '2px' }} />
                      <Typography sx={{ fontSize: 13, color: t.textPrimary }}>{feature}</Typography>
                    </Stack>
                  ))}
                </Stack>

                {sampleSectionsFor(previewProduct.product_type).map((section) => (
                  <Box key={section.title} sx={{ mb: 3 }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 700, borderBottom: `1px solid ${t.border}`, pb: 0.5, mb: 1, color: t.textPrimary }}>
                      {section.title}
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: t.textSecondary, mb: 1 }}>{section.summary}</Typography>
                    <TableContainer sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ '& th': { bgcolor: t.cardBgAlt, fontWeight: 700, fontSize: 12, color: t.textSecondary } }}>
                            <TableCell>Segment</TableCell>
                            <TableCell align="right">Count</TableCell>
                            <TableCell align="right">Share</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {section.rows.map((row) => (
                            <TableRow key={row.label} sx={{ '& td': { borderColor: t.borderSoft } }}>
                              <TableCell sx={{ fontSize: 13, color: t.textPrimary }}>{row.label}</TableCell>
                              <TableCell align="right" sx={{ fontSize: 13, color: t.textPrimary }}>{row.count}</TableCell>
                              <TableCell align="right" sx={{ fontSize: 13, color: t.textPrimary }}>
                                {row.percentage == null ? 'N/A' : `${row.percentage}%`}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ))}

                <Typography sx={{ color: t.textFaint, fontSize: 11, mt: 3 }}>
                  Prodculator B2B Intelligence. Do not redistribute outside authorised recipients.
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setPreviewProduct(null)}>Close</Button>
              {previewProduct.self_service && !subscriptionsByProduct.get(previewProduct.product_type) && (
                <Button
                  variant="contained"
                  startIcon={<CreditCard />}
                  onClick={() => {
                    const product = previewProduct;
                    setPreviewProduct(null);
                    openProduct(product);
                  }}
                >
                  Subscribe
                </Button>
              )}
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
