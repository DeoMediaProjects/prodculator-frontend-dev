import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useSnackbar } from 'notistack';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CloudDownloadOutlined,
  DeleteOutline,
  DonutSmallOutlined,
  InboxOutlined,
  PersonAddAlt1Outlined,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from './DataTable';
import { BusinessIntelligenceTour } from './BusinessIntelligenceTour';
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

/** "in 3 days" / "tomorrow" / "2 days ago". Turns a date into something that
 *  reads like it belongs to this client rather than a row in a table. */
function relativeDay(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const b = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const days = Math.round((b.getTime() - a.getTime()) / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${Math.abs(days)} days ago`;
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
  // Two slots: the account holder, who cannot be removed, plus one address.
  const atRecipientLimit = recipients.length >= 2;
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
          <DonutSmallOutlined sx={{ color: t.gold, fontSize: 28 }} />
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

  const nextDelivery = isActive
    ? (formatDate(subscription.next_delivery_at) ?? 'Being scheduled')
    : 'Paused';
  const nextDeliveryRelative = isActive ? relativeDay(subscription.next_delivery_at) : null;

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

      {/* Masthead. The client's own name anchors the page, the product sits
          under it, and the one thing they actually came to check (when the next
          report lands) is the single emphasised figure. Deliberately asymmetric:
          four equal facts in a row read as a generic stat bar and gave the page
          no focal point at all. */}
      <Box data-tour="bi-summary" sx={{ ...card, p: { xs: 2.75, md: 3.5 }, mb: 5 }}>
        {/* Identity: who this account belongs to and what they are subscribed to. */}
        <Typography sx={{ ...label, mb: 0.5 }}>Prepared for</Typography>
        <Typography
          sx={{
            fontSize: { xs: 22, md: 26 },
            fontWeight: 800,
            color: t.textPrimary,
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
          }}
        >
          {subscription.company_name || user?.name || 'Your organisation'}
        </Typography>
        <Typography sx={{ fontSize: 14.5, color: t.textSecondary, mt: 0.75 }}>
          {productTitle(subscription.product_type)}
        </Typography>

        <Divider sx={{ borderColor: t.borderSoft, my: 2.75 }} />

        {/* One band of four facts. Next delivery belongs IN this row, not
            stranded behind a rule on the far right: with only three items the
            row could not fill the width without scattering them. */}
        <Box
          sx={{
            display: 'grid',
            gap: { xs: 2.5, sm: 3 },
            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
          }}
        >
          <Box>
            <Typography sx={{ ...label, mb: 0.5 }}>Subscription status</Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusColor, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: statusColor }}>
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </Typography>
            </Stack>
          </Box>
          <Box>
            <Typography sx={{ ...label, mb: 0.5 }}>Billing</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
              {subscription.source === 'manual_contract' ? 'Agreed contract' : 'Card subscription'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ ...label, mb: 0.5 }}>Reports arrive</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
              {subscription.delivery_frequency === 'quarterly' ? 'Every quarter' : 'Every month'}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ ...label, mb: 0.5 }}>Next delivery</Typography>
            <Typography sx={{ fontSize: 15, fontWeight: 700, color: isActive ? t.gold : t.textSecondary }}>
              {nextDelivery}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: t.textSecondary, mt: 0.25 }}>
              {nextDeliveryRelative ? `${nextDeliveryRelative}, sent by email` : 'Sent by email'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Recipients and Request a report sit side by side. Both are small, and
          pairing them stops the page from being three identical full-width
          blocks stacked down a column. */}
      <Box
        sx={{
          display: 'grid',
          gap: { xs: 5, md: 4 },
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(0, 1fr)' },
          // Each card sizes to its own content. Stretching them to equal height
          // only moved the empty space inside the shorter card, which reads far
          // worse than two cards of honest, different heights.
          alignItems: 'start',
        }}
      >
      <Box>
      <Typography data-tour="bi-recipients" sx={{ ...sectionTitle, mb: 0.5 }}>Recipients</Typography>
      <Typography sx={{ ...label, mb: 1.5 }}>
        Every PDF is watermarked with the address it was sent to, so each copy is traceable.
      </Typography>
      <Box sx={{ ...card, p: 2.75 }}>
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
                <Tooltip title="The account holder always receives the report">
                  <Typography sx={{ fontSize: 12.5, color: t.textSecondary, whiteSpace: 'nowrap' }}>
                    Always included
                  </Typography>
                </Tooltip>
              ) : (
                <Tooltip title="Remove recipient">
                  <Button
                    size="small"
                    aria-label={`Remove ${recipient.email}`}
                    disabled={savingRecipient}
                    onClick={() => void saveRecipient(null)}
                    startIcon={<DeleteOutline sx={{ fontSize: 17 }} />}
                    sx={{
                      color: t.textSecondary, fontWeight: 600, whiteSpace: 'nowrap',
                      '&:hover': { color: t.error, bgcolor: 'transparent' },
                    }}
                  >
                    Remove
                  </Button>
                </Tooltip>
              )}
            </Stack>
          ))}
        </Stack>

        {/* The add control stays on screen at capacity, disabled and explained,
            rather than disappearing. Hiding it made it look as though there was
            no way to manage the list at all. */}
        <Divider sx={{ borderColor: t.borderSoft, mt: 1.5, mb: 2.25 }} />
        <Typography sx={{ ...label, mb: 1.25 }}>Add a recipient</Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'flex-start' }}>
          <TextField
            size="small"
            type="email"
            placeholder="name@company.com"
            value={newRecipient}
            disabled={atRecipientLimit || savingRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newRecipient.trim() && !atRecipientLimit) {
                void saveRecipient(newRecipient.trim());
              }
            }}
            sx={{ flex: 1, minWidth: 0 }}
          />
          <Tooltip title={atRecipientLimit ? 'Remove the additional recipient first' : ''}>
            <Box component="span" sx={{ display: 'inline-flex' }}>
              <Button
                variant="contained"
                startIcon={
                  savingRecipient
                    ? <CircularProgress size={15} sx={{ color: 'inherit' }} />
                    : <PersonAddAlt1Outlined sx={{ fontSize: 18 }} />
                }
                disabled={atRecipientLimit || !newRecipient.trim() || savingRecipient}
                onClick={() => void saveRecipient(newRecipient.trim())}
                sx={{ whiteSpace: 'nowrap' }}
              >
                Add
              </Button>
            </Box>
          </Tooltip>
        </Stack>
        <Typography sx={{ ...label, mt: 1.5 }}>
          {atRecipientLimit
            ? 'Your plan covers the account holder plus one address. Contact us to extend distribution.'
            : 'They will receive every scheduled report, watermarked with their own address.'}
        </Typography>
      </Box>
      </Box>

      {/* Ad-hoc request */}
      <Box>
      <Typography data-tour="bi-request" sx={{ ...sectionTitle, mb: 0.5 }}>Request a report</Typography>
      <Typography sx={{ ...label, mb: 1.5 }}>
        Within your entitlement, request an out-of-cycle report for a custom period.
      </Typography>
      <Box sx={{ ...card, p: 2.75 }}>
        <Stack direction="row" spacing={2} alignItems="flex-end" sx={{ flexWrap: 'wrap', rowGap: 2 }}>
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
      </Box>

      {/* Report history closes the page: it is the archive, it grows over time,
          and the things a client acts on live above it. */}
      <Typography data-tour="bi-history" sx={{ ...sectionTitle, mt: 5, mb: 1.5 }}>Report history</Typography>
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

      {/* Subscribers only, first visit only. Someone without a subscription
          gets the empty state above, which already explains the product. */}
      <BusinessIntelligenceTour enabled={!loading && Boolean(subscription)} />
    </Box>
  );
}
