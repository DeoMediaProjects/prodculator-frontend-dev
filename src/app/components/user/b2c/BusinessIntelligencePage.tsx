import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSnackbar } from 'notistack';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CloudDownloadOutlined,
  DeleteOutline,
  InsightsOutlined,
  InboxOutlined,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from './DataTable';
import {
  b2bService,
  type B2BIntelligenceRequest,
  type B2BSubscription,
} from '@/services/b2b.service';

/**
 * Business Intelligence client console. Lives inside the dashboard shell, so the
 * sidebar, page title and transitions come from B2CLayout and this file renders
 * content only.
 *
 * Client-facing copy says "Business Intelligence", never "B2B". The b2b_ prefix
 * stays in code and API paths.
 */

const PRODUCT_TITLES: Record<string, string> = {
  camera_equipment: 'Camera & Equipment Demand Intelligence',
  production_services: 'Production Services Intelligence',
  crew_casting: 'Crew & Casting Demand Intelligence',
  production_trend: 'Strategic Production Trend Intelligence',
  enterprise: 'Bespoke Enterprise Intelligence',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  past_due: 'Payment past due',
  cancelled: 'Cancelled',
  paused: 'Paused',
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  completed: 'Ready',
  processing: 'Preparing',
  held: 'Not enough data',
  failed: 'Failed',
};

function productTitle(productType: string) {
  return PRODUCT_TITLES[productType] ?? productType.replace(/_/g, ' ');
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Local-date ISO. `toISOString()` converts to UTC first, which rolls the date
 *  back a day for anyone east of Greenwich and pre-fills the wrong month. */
function isoLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Last complete calendar month, the period a report normally covers. */
function lastCompleteMonth() {
  const now = new Date();
  return {
    start: isoLocal(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
    end: isoLocal(new Date(now.getFullYear(), now.getMonth(), 0)),
  };
}

export function BusinessIntelligencePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [subscriptions, setSubscriptions] = useState<B2BSubscription[]>([]);
  const [requests, setRequests] = useState<B2BIntelligenceRequest[]>([]);
  const [selectedId, setSelectedId] = useState('');

  const [newRecipient, setNewRecipient] = useState('');
  const [savingRecipient, setSavingRecipient] = useState(false);

  const initialPeriod = useMemo(lastCompleteMonth, []);
  const [periodStart, setPeriodStart] = useState(initialPeriod.start);
  const [periodEnd, setPeriodEnd] = useState(initialPeriod.end);
  const [requesting, setRequesting] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const card = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px' };
  const sectionTitle = { fontWeight: 800, fontSize: 18, color: t.textPrimary };
  const label = { fontSize: 12.5, color: t.textSecondary };

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const [subs, reqs] = await Promise.all([
        b2bService.getSubscriptions(),
        b2bService.getRequests(),
      ]);
      setSubscriptions(subs);
      setRequests(reqs);
      setSelectedId((current) => current || subs[0]?.id || '');
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subscription = useMemo(
    () => subscriptions.find((s) => s.id === selectedId) ?? subscriptions[0] ?? null,
    [subscriptions, selectedId],
  );

  // Deliveries for the selected subscription. Rows created before the
  // subscription link existed fall back to matching on product.
  const rows = useMemo(() => {
    if (!subscription) return [];
    return requests.filter(
      (r) =>
        r.b2b_subscription_id === subscription.id ||
        (!r.b2b_subscription_id && r.product_type === subscription.product_type),
    );
  }, [requests, subscription]);

  const recipients = useMemo(() => {
    if (!subscription) return [] as { email: string; primary: boolean }[];
    const list: { email: string; primary: boolean }[] = [];
    if (user?.email) list.push({ email: user.email, primary: true });
    const extra = subscription.extra_recipient_email;
    if (extra && extra.toLowerCase() !== (user?.email ?? '').toLowerCase()) {
      list.push({ email: extra, primary: false });
    }
    return list;
  }, [subscription, user?.email]);

  const isActive = subscription?.status === 'active';
  const statusColor = !subscription
    ? t.textSecondary
    : subscription.status === 'active'
      ? t.success
      : subscription.status === 'past_due'
        ? t.warning
        : t.error;

  const saveRecipient = async (email: string | null) => {
    if (!subscription) return;
    setSavingRecipient(true);
    try {
      const updated = await b2bService.updateRecipients(subscription.id, email);
      setSubscriptions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setNewRecipient('');
      enqueueSnackbar(email ? 'Recipient added.' : 'Recipient removed.', { variant: 'success' });
    } catch {
      enqueueSnackbar('Could not update recipients. Please try again.', { variant: 'error' });
    } finally {
      setSavingRecipient(false);
    }
  };

  const submitRequest = async () => {
    if (!subscription) return;
    if (!periodStart || !periodEnd) {
      enqueueSnackbar('Choose a start and end date.', { variant: 'warning' });
      return;
    }
    if (periodStart > periodEnd) {
      enqueueSnackbar('The start date must come before the end date.', { variant: 'warning' });
      return;
    }
    setRequesting(true);
    try {
      await b2bService.createRequest({
        product_type: subscription.product_type,
        period_start: periodStart,
        period_end: periodEnd,
      });
      enqueueSnackbar('Report requested. It will appear below and be emailed when ready.', {
        variant: 'success',
      });
      await load();
    } catch {
      enqueueSnackbar('Could not submit that request. It may fall outside your entitlement.', {
        variant: 'error',
      });
    } finally {
      setRequesting(false);
    }
  };

  const download = async (request: B2BIntelligenceRequest) => {
    setDownloadingId(request.id);
    try {
      await b2bService.downloadRequestPdf(request);
    } catch {
      enqueueSnackbar('That report could not be downloaded.', { variant: 'error' });
    } finally {
      setDownloadingId(null);
    }
  };

  const columns: Column<B2BIntelligenceRequest>[] = [
    {
      key: 'period',
      header: 'PERIOD',
      width: '1.4fr',
      sortValue: (r) => r.period_start,
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: t.textPrimary, whiteSpace: 'nowrap' }}>
          {formatDate(r.period_start)} to {formatDate(r.period_end)}
        </Typography>
      ),
    },
    {
      key: 'product_type',
      header: 'PRODUCT',
      width: '1.6fr',
      sortValue: (r) => productTitle(r.product_type),
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary }}>
          {productTitle(r.product_type)}
        </Typography>
      ),
    },
    {
      key: 'status',
      header: 'STATUS',
      width: '0.9fr',
      sortValue: (r) => r.status,
      render: (r) => {
        const color =
          r.status === 'completed'
            ? t.success
            : r.status === 'held'
              ? t.warning
              : r.status === 'failed'
                ? t.error
                : t.textSecondary;
        return (
          <Typography sx={{ fontSize: 13, fontWeight: 700, color }}>
            {REQUEST_STATUS_LABELS[r.status] ?? r.status}
          </Typography>
        );
      },
    },
    {
      key: 'delivered',
      header: 'DELIVERED',
      width: '0.9fr',
      sortValue: (r) => r.delivered_at ?? r.completed_at ?? '',
      render: (r) => (
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>
          {formatDate(r.delivered_at ?? r.completed_at) ?? 'Not yet'}
        </Typography>
      ),
    },
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress sx={{ color: t.gold }} />
      </Box>
    );
  }

  if (loadError) {
    return (
      <Alert
        severity="error"
        action={<Button onClick={() => void load()}>Retry</Button>}
        sx={{ borderRadius: '16px' }}
      >
        Could not load your Business Intelligence account.
      </Alert>
    );
  }

  if (!subscription) {
    return (
      <Box sx={{ ...card, p: { xs: 4, md: 8 }, textAlign: 'center' }}>
        <Box
          sx={{
            width: 56, height: 56, borderRadius: '14px', bgcolor: t.goldDim,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 2,
          }}
        >
          <InsightsOutlined sx={{ color: t.gold, fontSize: 28 }} />
        </Box>
        <Typography sx={{ fontSize: 22, fontWeight: 800, color: t.textPrimary, mb: 1 }}>
          No subscription yet
        </Typography>
        <Typography sx={{ color: t.textSecondary, maxWidth: 460, mx: 'auto', mb: 3 }}>
          Business Intelligence turns anonymised, consented production signals into market
          intelligence for equipment houses, service providers, agencies and investors.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/b2b')}>
          See what is included
        </Button>
      </Box>
    );
  }

  const facts: { label: string; value: string; note?: string; color?: string }[] = [
    {
      label: 'Product',
      value: productTitle(subscription.product_type),
      note: `${subscription.delivery_frequency} delivery`,
    },
    {
      label: 'Status',
      value: STATUS_LABELS[subscription.status] ?? subscription.status,
      note: subscription.source === 'manual_contract' ? 'Contract' : 'Subscription',
      color: statusColor,
    },
    {
      label: 'Next delivery',
      value: isActive ? (formatDate(subscription.next_delivery_at) ?? 'Being scheduled') : 'Paused',
      note: 'Sent by email',
    },
    {
      label: 'Recipients',
      value: String(recipients.length),
      note: 'On distribution',
    },
  ];

  return (
    <Box>
      {subscriptions.length > 1 && (
        <TextField
          select
          size="small"
          value={subscription.id}
          onChange={(e) => setSelectedId(e.target.value)}
          sx={{ mb: 3, minWidth: 300 }}
        >
          {subscriptions.map((s) => (
            <MenuItem key={s.id} value={s.id}>
              {productTitle(s.product_type)}
            </MenuItem>
          ))}
        </TextField>
      )}

      {subscription.status === 'past_due' && (
        <Alert severity="warning" sx={{ mb: 3, borderRadius: '16px' }}>
          Deliveries are paused while the latest payment is outstanding. Your schedule resumes
          automatically once it clears.
        </Alert>
      )}

      {/* Subscription at a glance. One panel of labelled facts rather than a row
          of stat cards, which would repeat the same shape four times. */}
      <Box sx={{ ...card, p: 2.75, mb: 4 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          divider={
            <Divider
              flexItem
              orientation="vertical"
              sx={{ borderColor: t.border, display: { xs: 'none', md: 'block' } }}
            />
          }
          spacing={{ xs: 2, md: 3 }}
        >
          {facts.map((fact) => (
            <Box key={fact.label} sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ ...label, mb: 0.75 }}>{fact.label}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {fact.color && (
                  <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: fact.color, flexShrink: 0 }} />
                )}
                <Typography
                  sx={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: fact.color ?? t.textPrimary,
                    lineHeight: 1.3,
                  }}
                >
                  {fact.value}
                </Typography>
              </Stack>
              {fact.note && (
                <Typography sx={{ fontSize: 12.5, color: t.textSecondary, mt: 0.5 }}>
                  {fact.note}
                </Typography>
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Report history */}
      <Typography sx={{ ...sectionTitle, mb: 1.5 }}>Report history</Typography>
      <Box sx={{ mb: 4 }}>
        <DataTable
          columns={columns}
          rows={rows}
          getRowId={(r) => r.id}
          actionsHeader=""
          emptyIcon={<InboxOutlined sx={{ color: t.textSecondary, fontSize: 28 }} />}
          emptyMessage="No deliveries yet. Your first report arrives on the next scheduled date."
          rowActions={(r) => (
            <Button
              size="small"
              startIcon={
                downloadingId === r.id
                  ? <CircularProgress size={14} sx={{ color: 'inherit' }} />
                  : <CloudDownloadOutlined sx={{ fontSize: 17 }} />
              }
              disabled={r.status !== 'completed' || downloadingId === r.id}
              onClick={() => void download(r)}
              sx={{ color: t.gold, fontWeight: 700, whiteSpace: 'nowrap' }}
            >
              PDF
            </Button>
          )}
        />
      </Box>

      {/* Recipients */}
      <Typography sx={{ ...sectionTitle, mb: 0.5 }}>Recipients</Typography>
      <Typography sx={{ ...label, mb: 1.5 }}>
        Every PDF is watermarked with the address it was sent to, so each copy is traceable.
      </Typography>
      <Box sx={{ ...card, p: 2.75, mb: 4 }}>
        <Stack divider={<Divider sx={{ borderColor: t.borderSoft }} />}>
          {recipients.map((recipient) => (
            <Stack
              key={recipient.email}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
              sx={{ py: 1.25 }}
            >
              <Typography sx={{ fontSize: 14, color: t.textPrimary, minWidth: 0, wordBreak: 'break-all' }}>
                {recipient.email}
              </Typography>
              {recipient.primary ? (
                <Typography sx={{ fontSize: 12.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                  Always included
                </Typography>
              ) : (
                <IconButton
                  size="small"
                  aria-label={`Remove ${recipient.email}`}
                  disabled={savingRecipient}
                  onClick={() => void saveRecipient(null)}
                  sx={{ color: t.textSecondary, '&:hover': { color: t.error, bgcolor: 'transparent' } }}
                >
                  <DeleteOutline sx={{ fontSize: 19 }} />
                </IconButton>
              )}
            </Stack>
          ))}
        </Stack>

        {recipients.length < 2 ? (
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mt: 2.5 }}>
            <TextField
              size="small"
              type="email"
              placeholder="name@company.com"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              sx={{ flex: 1, maxWidth: { sm: 320 } }}
            />
            <Button
              variant="contained"
              disabled={!newRecipient.trim() || savingRecipient}
              onClick={() => void saveRecipient(newRecipient.trim())}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Add recipient
            </Button>
          </Stack>
        ) : (
          <Typography sx={{ ...label, mt: 2 }}>
            Your plan covers the account holder plus one address. Contact us to extend distribution.
          </Typography>
        )}
      </Box>

      {/* Ad-hoc request */}
      <Typography sx={{ ...sectionTitle, mb: 0.5 }}>Request a report</Typography>
      <Typography sx={{ ...label, mb: 1.5 }}>
        Within your entitlement, request an out-of-cycle report for a custom period.
      </Typography>
      <Box sx={{ ...card, p: 2.75 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }}>
          <TextField
            size="small"
            type="date"
            label="From"
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            size="small"
            type="date"
            label="To"
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            variant="contained"
            disabled={requesting || !isActive}
            onClick={() => void submitRequest()}
            startIcon={requesting ? <CircularProgress size={15} sx={{ color: 'inherit' }} /> : undefined}
            sx={{ whiteSpace: 'nowrap' }}
          >
            {requesting ? 'Requesting' : 'Request report'}
          </Button>
        </Stack>
        <Typography sx={{ ...label, mt: 2 }}>
          {isActive
            ? 'Periods covering whole calendar months are produced fastest. A period without enough consented signals is held rather than sent thin.'
            : 'Ad-hoc requests are available while your subscription is active.'}
        </Typography>
      </Box>
    </Box>
  );
}
