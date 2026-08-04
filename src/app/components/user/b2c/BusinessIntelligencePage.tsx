import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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
  ApartmentOutlined,
  CalendarMonthOutlined,
  CloudDownloadOutlined,
  DeleteOutline,
  DescriptionOutlined,
  DonutSmallOutlined,
  InboxOutlined,
  InfoOutlined,
  PersonAddAlt1Outlined,
  ScheduleOutlined,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from './DataTable';
import { BusinessIntelligenceTour } from './BusinessIntelligenceTour';
import { uploadAccountLogo } from '@/services/auth.service';
import {
  b2bService,
  type B2BIntelligenceRequest,
  type B2BSubscription,
} from '@/services/b2b.service';

// Mirrors the server's own limits so an obviously-invalid file is refused
// without a round trip. The server re-validates regardless; this is UX, not a
// security boundary.
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ACCEPTED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

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

/** "4 days, 9h, 18m" until *value*, or null once it has passed. Deliberately
 *  drops to hours and minutes near the end: "in 1 day" reads the same twenty
 *  minutes before a delivery as it does twenty hours before it. */
function countdownTo(value: string | null | undefined, now: number): string | null {
  if (!value) return null;
  const target = new Date(value).getTime();
  if (Number.isNaN(target)) return null;
  let remaining = Math.floor((target - now) / 1000);
  if (remaining <= 0) return null;

  const days = Math.floor(remaining / 86_400);
  remaining -= days * 86_400;
  const hours = Math.floor(remaining / 3_600);
  const minutes = Math.floor((remaining - hours * 3_600) / 60);

  const parts: string[] = [];
  if (days) parts.push(`${days} day${days === 1 ? '' : 's'}`);
  if (days || hours) parts.push(`${hours}h`);
  parts.push(`${minutes}m`);
  return parts.join(', ');
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
  const [statusFilter, setStatusFilter] = useState('all');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Seeded from the profile, then held locally so a fresh upload shows straight
  // away rather than waiting for the auth context to refetch.
  const [logoOverride, setLogoOverride] = useState<string | null>(null);
  const logoUrl = logoOverride ?? user?.logo_url ?? null;

  const onLogoPicked = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset immediately so picking the same file twice still fires onChange.
    event.target.value = '';
    if (!file) return;

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      enqueueSnackbar('Logos must be a PNG, JPG or WEBP file.', { variant: 'warning' });
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      enqueueSnackbar('Logos must be 2MB or smaller.', { variant: 'warning' });
      return;
    }

    setUploadingLogo(true);
    try {
      const { logo_url } = await uploadAccountLogo(file);
      setLogoOverride(logo_url);
      enqueueSnackbar('Logo updated.', { variant: 'success' });
    } catch {
      enqueueSnackbar('That logo could not be uploaded. Please try again.', { variant: 'error' });
    } finally {
      setUploadingLogo(false);
    }
  };

  // Ticks the delivery countdown. A minute is the smallest unit it displays, so
  // anything faster would re-render for no visible change.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const card = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px' };
  const sectionTitle = { fontWeight: 800, fontSize: 18, color: t.textPrimary };
  const label = { fontSize: 12.5, color: t.textSecondary };
  // Muted tile behind each masthead icon. Keeps the icons from reading as loose
  // glyphs floating next to the text, and gives the four facts a shared rhythm.
  const iconTile = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 34,
    height: 34,
    borderRadius: '10px',
    bgcolor: t.goldDim,
    border: `1px solid ${t.borderSoft}`,
  };

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

  // Scope control above the table. Distinct from DataTable's per-column text
  // filters: this is the one cut clients actually ask for ("just the ones I can
  // download"), and burying it behind the filter toggle hid it.
  const visibleRows = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

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
        // Pill rather than coloured text: status is the one column a client
        // scans down, and a filled chip is findable at a glance where coloured
        // body text just reads as another cell.
        return (
          <Box
            component="span"
            sx={{
              display: 'inline-flex', alignItems: 'center',
              px: 1.1, py: 0.3, borderRadius: '999px',
              border: `1px solid ${color}`, bgcolor: `${color}1A`,
            }}
          >
            <Typography sx={{ fontSize: 12, fontWeight: 700, color, whiteSpace: 'nowrap' }}>
              {REQUEST_STATUS_LABELS[r.status] ?? r.status}
            </Typography>
          </Box>
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
  // Prefer the precise countdown; fall back to "in 4 days" when the API only
  // gave a date, since a date alone makes the countdown read "0h, 0m".
  const nextDeliveryCountdown = isActive ? countdownTo(subscription.next_delivery_at, now) : null;
  const nextDeliveryNote = nextDeliveryCountdown
    ? `${nextDeliveryCountdown} until delivery by email`
    : nextDeliveryRelative
      ? `${nextDeliveryRelative}, sent by email`
      : 'Sent by email';

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
        <Typography sx={{ ...label, mb: 0.75 }}>Prepared for</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {/* Doubles as the upload control: the placeholder is the affordance,
              so there is no separate "add a logo" button competing with the
              company name for attention. */}
          <Tooltip title={logoUrl ? 'Change logo' : 'Upload your logo'}>
            <Box
              component="button"
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              aria-label={logoUrl ? 'Change organisation logo' : 'Upload organisation logo'}
              sx={{
                ...iconTile,
                width: 52,
                height: 52,
                borderRadius: '12px',
                flexShrink: 0,
                p: 0,
                overflow: 'hidden',
                cursor: uploadingLogo ? 'default' : 'pointer',
                position: 'relative',
                transition: 'border-color .18s ease',
                '&:hover': { borderColor: t.gold },
                '&:focus-visible': { outline: `2px solid ${t.gold}`, outlineOffset: 2 },
              }}
            >
              {uploadingLogo ? (
                <CircularProgress size={18} sx={{ color: t.gold }} />
              ) : logoUrl ? (
                <Box
                  component="img"
                  src={logoUrl}
                  alt=""
                  // contain, not cover: a logo cropped to fill a square is worse
                  // than one that leaves margin.
                  sx={{ width: '100%', height: '100%', objectFit: 'contain', p: 0.5 }}
                />
              ) : (
                <ApartmentOutlined sx={{ fontSize: 24, color: t.gold }} />
              )}
            </Box>
          </Tooltip>
          <Box
            component="input"
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onLogoPicked}
            sx={{ display: 'none' }}
          />
          <Box sx={{ minWidth: 0 }}>
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
            <Typography sx={{ fontSize: 14.5, color: t.textSecondary, mt: 0.4 }}>
              {productTitle(subscription.product_type)}
            </Typography>
          </Box>
        </Stack>

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
          {/* Status carries a state dot rather than an icon tile: the colour is
              the information, and a tile beside it would compete with it. */}
          <Box>
            <Typography sx={{ ...label, mb: 0.5 }}>Subscription status</Typography>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: statusColor, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 15, fontWeight: 700, color: statusColor }}>
                {STATUS_LABELS[subscription.status] ?? subscription.status}
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box aria-hidden sx={{ ...iconTile, flexShrink: 0 }}>
              <DescriptionOutlined sx={{ fontSize: 17, color: t.gold }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ ...label, mb: 0.25 }}>Billing</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
                {subscription.source === 'manual_contract' ? 'Agreed contract' : 'Card subscription'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box aria-hidden sx={{ ...iconTile, flexShrink: 0 }}>
              <CalendarMonthOutlined sx={{ fontSize: 17, color: t.gold }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ ...label, mb: 0.25 }}>Reports arrive</Typography>
              <Typography sx={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>
                {subscription.delivery_frequency === 'quarterly' ? 'Every quarter' : 'Every month'}
              </Typography>
            </Box>
          </Stack>

          {/* The one thing a client opens this page to check, so it is the only
              figure allowed to carry the accent colour. */}
          <Stack direction="row" spacing={1.5} alignItems="flex-start">
            <Box aria-hidden sx={{ ...iconTile, flexShrink: 0 }}>
              <ScheduleOutlined sx={{ fontSize: 17, color: t.gold }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ ...label, mb: 0.25 }}>Next delivery</Typography>
              <Typography sx={{ fontSize: 16, fontWeight: 800, color: isActive ? t.gold : t.textSecondary }}>
                {nextDelivery}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: t.textSecondary, mt: 0.25 }}>
                {nextDeliveryNote}
              </Typography>
            </Box>
          </Stack>
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
          // Equal height, with each card's trailing note pinned to its own
          // bottom edge. Sizing each card to its content left a ragged step
          // between them; stretching alone just moved the gap inside the
          // shorter card, so the two have to be done together.
          alignItems: 'stretch',
        }}
      >
      <Box data-tour="bi-recipients" sx={{ ...card, p: 2.75, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Heading sits inside the card with the count opposite it, so the
            section name and the thing it names share one surface. */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2} sx={{ mb: 0.5 }}>
          <Typography sx={sectionTitle}>Recipients</Typography>
          <Box
            sx={{
              px: 1.25, py: 0.375, borderRadius: '999px', flexShrink: 0,
              bgcolor: t.goldDim, border: `1px solid ${t.borderSoft}`,
            }}
          >
            <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: t.textSecondary, whiteSpace: 'nowrap' }}>
              {`${recipients.length} included`}
            </Typography>
          </Box>
        </Stack>
        <Typography sx={{ ...label, mb: 1.5 }}>
          Every PDF is watermarked with the address it was sent to, so each copy is traceable.
        </Typography>
        <Stack divider={<Divider sx={{ borderColor: t.borderSoft }} />}>
          {recipients.map((recipient, index) => (
            <Stack
              key={recipient.email}
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
              sx={{ py: 1.25 }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                {/* Numbering makes the two-slot allowance legible at a glance:
                    the plan is "the account holder plus one", and a bare list
                    doesn't communicate that there is a limit at all. */}
                <Box
                  aria-hidden
                  sx={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    bgcolor: t.goldDim, border: `1px solid ${t.borderSoft}`,
                  }}
                >
                  <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: t.gold }}>{index + 1}</Typography>
                </Box>
                <Typography sx={{ fontSize: 14, color: t.textPrimary, minWidth: 0, wordBreak: 'break-all' }}>
                  {recipient.email}
                </Typography>
              </Stack>
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
        {/* mt:auto pins this to the card's bottom edge, so whichever card is
            shorter absorbs the difference as breathing room above its footnote
            rather than as dead space below it. */}
        <Stack direction="row" spacing={0.75} alignItems="flex-start" sx={{ mt: 'auto', pt: 1.5 }}>
          <InfoOutlined sx={{ fontSize: 15, color: t.textFaint, flexShrink: 0, mt: '1px' }} />
          <Typography sx={label}>
            {atRecipientLimit
              ? 'Your plan covers the account holder plus one address. Contact us to extend distribution.'
              : 'They will receive every scheduled report, watermarked with their own address.'}
          </Typography>
        </Stack>
      </Box>

      {/* Ad-hoc request */}
      <Box data-tour="bi-request" sx={{ ...card, p: 2.75, height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Typography sx={{ ...sectionTitle, mb: 0.5 }}>Request a report</Typography>
        <Typography sx={{ ...label, mb: 2 }}>
          Within your entitlement, request an out-of-cycle report for a custom period.
        </Typography>
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
        {/* Two separate lines, as two separate facts: how to get a report
            fastest, and what happens when a period is too thin to publish. Run
            together they read as one hedge and the second gets skimmed past. */}
        {isActive ? (
          <Stack spacing={0.5} sx={{ mt: 'auto', pt: 2 }}>
            <Typography sx={label}>Periods covering whole calendar months are produced fastest.</Typography>
            <Typography sx={label}>A period without enough consented signals is held rather than sent thin.</Typography>
          </Stack>
        ) : (
          <Typography sx={{ ...label, mt: 'auto', pt: 2 }}>
            Ad-hoc requests are available while your subscription is active.
          </Typography>
        )}
      </Box>
      </Box>

      {/* Report history closes the page: it is the archive, it grows over time,
          and the things a client acts on live above it. */}
      <Box data-tour="bi-history" sx={{ mt: 5 }}>
      <DataTable
        title="Report history"
        headerAction={
          <TextField
            select
            size="small"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter reports by status"
            sx={{ minWidth: 160, '& .MuiInputBase-input': { fontSize: 13.5, py: 0.75 } }}
          >
            <MenuItem value="all">All reports</MenuItem>
            <MenuItem value="completed">Ready</MenuItem>
            <MenuItem value="processing">Preparing</MenuItem>
            <MenuItem value="held">Not enough data</MenuItem>
          </TextField>
        }
        pageSize={8}
        itemNoun="report"
        columns={columns}
        rows={visibleRows}
        getRowId={(r) => r.id}
        actionsHeader="FILE"
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

      {/* Subscribers only, first visit only. Someone without a subscription
          gets the empty state above, which already explains the product. */}
      <BusinessIntelligenceTour enabled={!loading && Boolean(subscription)} />
    </Box>
  );
}
