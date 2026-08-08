import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  LinearProgress,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Block,
  Star,
  CreditCard,
  Download,
  LockOpen,
  PeopleOutlined,
} from '@mui/icons-material';
import { adminApi } from '@/services/admin.api';
import type { SubscriberMetrics, Subscriber, SubscriberListResponse } from '@/services/admin.types';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';

type StatusFilter = 'active' | 'past_due' | 'canceled';
type CurrencyView = 'BOTH' | 'USD' | 'GBP';

// Fetched deep in one page so sorting and filtering cover every subscriber in
// the selected status rather than the first server page of twenty-five.
const FETCH_LIMIT = 500;

function initials(name: string): string {
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function csvCell(value: string | number | null): string {
  const s = value == null ? '' : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function ScriptAIOverview() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [status, setStatus] = useState<StatusFilter>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyView, setCurrencyView] = useState<CurrencyView>('BOTH');

  const [metrics, setMetrics] = useState<SubscriberMetrics | null>(null);
  const [subscriberData, setSubscriberData] = useState<SubscriberListResponse | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [subscribersError, setSubscribersError] = useState<string | null>(null);

  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditUserId, setCreditUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Search runs server-side, so it is debounced rather than fired per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchMetrics = useCallback(async (signal?: AbortSignal) => {
    setLoadingMetrics(true);
    const { data, error } = await adminApi.getSubscriberMetrics(signal);
    if (!signal?.aborted) {
      setMetrics(data);
      setMetricsError(error);
      setLoadingMetrics(false);
    }
  }, []);

  const fetchSubscribers = useCallback(async (signal?: AbortSignal) => {
    setLoadingSubscribers(true);
    const { data, error } = await adminApi.getSubscribers(
      { status, search: debouncedSearch || undefined, limit: FETCH_LIMIT, offset: 0 },
      signal,
    );
    if (!signal?.aborted) {
      setSubscriberData(data);
      setSubscribersError(error);
      setLoadingSubscribers(false);
    }
  }, [status, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchMetrics(controller.signal);
    return () => controller.abort();
  }, [fetchMetrics]);

  useEffect(() => {
    const controller = new AbortController();
    void fetchSubscribers(controller.signal);
    return () => controller.abort();
  }, [fetchSubscribers]);

  const handleBlock = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await adminApi.blockSubscriber(userId);
    setActionLoading(null);
    if (!error) void fetchSubscribers();
  };

  const handleUnblock = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await adminApi.unblockSubscriber(userId);
    setActionLoading(null);
    if (!error) void fetchSubscribers();
  };

  const handleCreditSubmit = async () => {
    if (!creditUserId || !creditAmount) return;
    setCreditLoading(true);
    const { error } = await adminApi.creditSubscriber(creditUserId, {
      adjustment: Number(creditAmount),
      reason: creditReason || undefined,
    });
    setCreditLoading(false);
    if (!error) {
      setCreditDialogOpen(false);
      setCreditUserId(null);
      setCreditAmount('');
      setCreditReason('');
      void fetchSubscribers();
    }
  };

  const counts = subscriberData?.counts ?? { active: 0, past_due: 0, canceled: 0 };
  // Memoised so the CSV export callback is not rebuilt on every render by a
  // fresh empty-array fallback.
  const subscribers = useMemo(() => subscriberData?.items ?? [], [subscriberData]);

  const exportCsv = useCallback(() => {
    const header = [
      'Name', 'Email', 'Company', 'Plan', 'Status', 'Reports this month',
      'Report limit', 'Monthly spend', 'Currency', 'Joined', 'Last active', 'Total reports',
    ];
    const body = subscribers.map((u) => [
      u.name, u.email, u.company, u.plan, u.status, u.reports_this_month,
      u.report_limit ?? 'Unlimited', u.monthly_spend, u.payment_currency,
      u.join_date, u.last_active ?? '', u.total_reports_generated,
    ]);
    const csv = [header, ...body].map((row) => row.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${status}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [subscribers, status]);

  useHeaderActions(
    <>
      <SegmentedToggle
        size="sm"
        value={currencyView}
        onChange={(v) => setCurrencyView(v as CurrencyView)}
        options={[
          { value: 'BOTH', label: 'Both' },
          { value: 'USD', label: 'USD' },
          { value: 'GBP', label: 'GBP' },
        ]}
      />
      <Button size="small" startIcon={<Download />} onClick={exportCsv} disabled={!subscribers.length}>
        Export CSV
      </Button>
    </>,
    [currencyView, exportCsv, subscribers.length],
  );

  const columns = useMemo<Column<Subscriber>[]>(() => [
    {
      key: 'name', header: 'SUBSCRIBER', width: '1.9fr',
      sortValue: (u) => u.name || u.email,
      render: (u) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
          <Box
            sx={{
              width: 32, height: 32, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: t.goldDim, color: t.gold,
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            }}
          >
            {initials(u.name)}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {u.name}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {u.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'company', header: 'COMPANY', width: '1.2fr',
      render: (u) => (
        <Typography sx={{ fontSize: 13.5, color: u.company ? t.textSecondary : t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {u.company || 'Not given'}
        </Typography>
      ),
    },
    {
      key: 'plan', header: 'PLAN', width: '1fr',
      render: (u) => (
        <Chip
          label={u.plan}
          size="small"
          icon={u.plan === 'Studio' ? <Star sx={{ fontSize: 14 }} /> : undefined}
          sx={{ bgcolor: t.goldDim, color: t.gold, fontWeight: 600, fontSize: '0.7rem' }}
        />
      ),
    },
    {
      key: 'usage', header: 'USAGE THIS MONTH', width: '1.4fr',
      // Sorts on how close the account is to its cap, since that is the number
      // that decides who is about to be blocked from generating a report.
      sortValue: (u) => (u.report_limit == null ? -1
        : u.report_limit > 0 ? (u.reports_this_month / u.report_limit) * 100 : 0),
      render: (u) => {
        const unlimited = u.report_limit == null;
        const pct = unlimited ? 100
          : u.report_limit! > 0 ? (u.reports_this_month / u.report_limit!) * 100 : 0;
        const nearCap = !unlimited && pct >= 80;
        return (
          <Box sx={{ minWidth: 110, width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, mb: 0.4 }}>
              <Typography sx={{ fontSize: 12, color: t.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
                {u.reports_this_month} of {unlimited ? 'unlimited' : u.report_limit}
              </Typography>
              {!unlimited && (
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: nearCap ? t.warning : t.textSecondary }}>
                  {Math.round(pct)}%
                </Typography>
              )}
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(pct, 100)}
              sx={{
                height: 4,
                bgcolor: t.inputBg,
                '& .MuiLinearProgress-bar': { bgcolor: nearCap ? t.warning : t.gold },
              }}
            />
            <Typography sx={{ fontSize: 11, color: t.textFaint, mt: 0.4 }}>
              {u.total_reports_generated} all time
            </Typography>
          </Box>
        );
      },
    },
    {
      key: 'monthly_spend', header: 'SPEND', width: '0.85fr', align: 'right',
      sortValue: (u) => u.monthly_spend,
      render: (u) => (
        <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {u.payment_currency === 'GBP' ? '£' : '$'}{u.monthly_spend}/mo
        </Typography>
      ),
    },
    {
      key: 'join_date', header: 'JOINED', width: '0.9fr',
      sortValue: (u) => new Date(u.join_date || 0).getTime() || 0,
      render: (u) => <Box sx={{ fontSize: 13.5, color: t.textSecondary }}>{u.join_date || 'Unknown'}</Box>,
    },
    {
      key: 'last_active', header: 'LAST ACTIVE', width: '0.95fr',
      sortValue: (u) => new Date(u.last_active || 0).getTime() || 0,
      render: (u) => (
        <Typography sx={{ fontSize: 13.5, color: u.last_active ? t.textSecondary : t.textFaint }}>
          {u.last_active ?? 'Never signed in'}
        </Typography>
      ),
    },
    {
      key: 'status', header: 'STATUS', width: '0.9fr',
      render: (u) => {
        const colour = u.status === 'Active' ? t.success
          : u.status === 'Past Due' ? t.warning : t.textFaint;
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: colour, flexShrink: 0 }} />
            <Typography sx={{ fontSize: 13, fontWeight: 600, color: colour }}>{u.status}</Typography>
          </Box>
        );
      },
    },
  ], [t]);

  if (loadingMetrics && loadingSubscribers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  const usd = metrics?.mrr_usd ?? 0;
  const gbp = metrics?.mrr_gbp ?? 0;
  const planMix = metrics?.plan_distribution ?? [];
  const mixTotal = planMix.reduce((sum, p) => sum + p.user_count, 0);

  return (
    <Box>
      {metricsError && <Alert severity="error" sx={{ mb: 2 }}>{metricsError}</Alert>}

      {/* Revenue leads because it is the one figure the rest of the page
          explains. The supporting counts sit beside it rather than in four
          equally weighted cards that give no reading order. */}
      <Box
        sx={{
          border: 1, borderColor: 'divider', bgcolor: 'background.paper',
          p: { xs: 2.5, md: 3 }, mb: 3,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'minmax(240px, 1fr) 2fr' },
          gap: { xs: 3, md: 4 },
          alignItems: 'start',
        }}
      >
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: t.textFaint }}>
            MONTHLY RECURRING REVENUE
          </Typography>
          <Typography sx={{ fontSize: { xs: 34, md: 42 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {currencyView === 'GBP'
              ? `£${gbp.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
              : `$${usd.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          </Typography>
          <Typography sx={{ fontSize: 13, color: t.textSecondary, mt: 0.5 }}>
            {currencyView === 'BOTH'
              // Two currencies are billed separately and never converted, so
              // showing a single blended total would be a made-up number.
              ? `Billed as $${usd.toLocaleString()} USD and £${gbp.toLocaleString()} GBP, shown unconverted`
              : `${currencyView} subscriptions only`}
          </Typography>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {([
            ['Paid accounts', metrics?.total_paid_users?.toLocaleString() ?? 'Unknown', null],
            [
              'Reports this month',
              metrics?.reports_this_month_total?.toLocaleString() ?? 'Unknown',
              metrics ? `${metrics.reports_this_month_free.toLocaleString()} free, ${metrics.reports_this_month_paid.toLocaleString()} paid` : null,
            ],
            ['Reports per paid user', metrics?.avg_reports_per_user?.toFixed(1) ?? 'Unknown', 'Monthly average'],
          ] as [string, string, string | null][]).map(([label, value, hint]) => (
            <Box key={label}>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums', lineHeight: 1.2 }}>
                {value}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: t.textSecondary }}>{label}</Typography>
              {hint && <Typography sx={{ fontSize: 11.5, color: t.textFaint, mt: 0.25 }}>{hint}</Typography>}
            </Box>
          ))}
        </Box>
      </Box>

      {/* Plan mix as one proportional bar: the question is what share of the
          base sits on each plan, which a row of separate cards cannot show. */}
      {mixTotal > 0 && (
        <Box sx={{ border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2.5, md: 3 }, mb: 3 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: t.textFaint, mb: 1.5 }}>
            PLAN MIX AND REVENUE
          </Typography>
          <Box sx={{ display: 'flex', height: 8, overflow: 'hidden', mb: 2 }}>
            {planMix.map((plan, i) => (
              <Tooltip key={plan.plan} title={`${plan.plan}: ${plan.user_count} of ${mixTotal}`}>
                <Box
                  sx={{
                    width: `${(plan.user_count / mixTotal) * 100}%`,
                    bgcolor: t.gold,
                    opacity: 1 - i * 0.22,
                    borderRight: i < planMix.length - 1 ? `2px solid ${t.cardBg}` : 'none',
                  }}
                />
              </Tooltip>
            ))}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 4, rowGap: 1.5 }}>
            {planMix.map((plan, i) => (
              <Box key={plan.plan} sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Box sx={{ width: 8, height: 8, bgcolor: t.gold, opacity: 1 - i * 0.22, flexShrink: 0, transform: 'translateY(-1px)' }} />
                <Box>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: t.textPrimary }}>
                    {plan.plan}
                    <Typography component="span" sx={{ fontSize: 13.5, fontWeight: 400, color: t.textSecondary }}>
                      {' '}{plan.user_count} {plan.user_count === 1 ? 'user' : 'users'}
                    </Typography>
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>
                    {plan.revenue > 0 ? `$${plan.revenue.toLocaleString()} per month` : 'No revenue'}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {subscribersError && <Alert severity="error" sx={{ mb: 2 }}>{subscribersError}</Alert>}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
        <SegmentedToggle
          value={status}
          onChange={(v) => setStatus(v as StatusFilter)}
          options={[
            { value: 'active', label: `Active ${counts.active}` },
            { value: 'past_due', label: `Past due ${counts.past_due}` },
            { value: 'canceled', label: `Cancelled ${counts.canceled}` },
          ]}
        />
        <TextField
          size="small"
          placeholder="Search every subscriber by name, email or company"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: t.textFaint, fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: '1 1 280px', maxWidth: 420 }}
        />
      </Box>

      <DataTable<Subscriber>
        title="Paid subscribers"
        columns={columns}
        rows={subscribers}
        getRowId={(u) => u.id}
        pageSize={12}
        itemNoun="subscriber"
        minWidth={1180}
        maxHeight={620}
        emptyIcon={<PeopleOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
        emptyMessage={debouncedSearch
          ? `No subscriber matches "${debouncedSearch}" in this status.`
          : 'No subscribers hold this status.'}
        rowActions={(u) => {
          const isBlocked = u.status === 'Canceled';
          const isLoading = actionLoading === u.id;
          return (
            <>
              <Tooltip title="Adjust report credits">
                <IconButton
                  size="small"
                  onClick={() => { setCreditUserId(u.id); setCreditDialogOpen(true); }}
                  sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}
                >
                  <CreditCard sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={isBlocked ? 'Restore access' : 'Block this account'}>
                <IconButton
                  size="small"
                  disabled={isLoading}
                  onClick={() => void (isBlocked ? handleUnblock(u.id) : handleBlock(u.id))}
                  sx={{ color: t.textSecondary, '&:hover': { color: isBlocked ? t.success : t.error } }}
                >
                  {isLoading
                    ? <CircularProgress size={16} sx={{ color: t.textSecondary }} />
                    : isBlocked ? <LockOpen sx={{ fontSize: 18 }} /> : <Block sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>
            </>
          );
        }}
      />

      <Dialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Adjust report credits</DialogTitle>
        <DialogContent>
          <TextField
            label="Credit adjustment"
            type="number"
            fullWidth
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            helperText="Positive adds credits, negative deducts them"
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Reason (optional)"
            fullWidth
            value={creditReason}
            onChange={(e) => setCreditReason(e.target.value)}
            helperText="Recorded in the audit trail alongside the change"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreditDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreditSubmit} disabled={!creditAmount || creditLoading}>
            {creditLoading ? <CircularProgress size={18} /> : 'Apply'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
