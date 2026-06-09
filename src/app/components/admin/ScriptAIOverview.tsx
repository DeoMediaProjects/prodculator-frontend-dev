import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Avatar,
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
  TrendingUp,
  Description,
  AttachMoney,
  People,
  Search,
  Visibility,
  Block,
  CheckCircle,
  Star,
  CreditCard,
  Download,
  LockOpen,
} from '@mui/icons-material';
import { adminApi } from '@/services/admin.api';
import type { SubscriberMetrics, Subscriber, SubscriberListResponse } from '@/services/admin.types';

type StatusFilter = 'active' | 'past_due' | 'canceled';

const TAB_TO_STATUS: Record<number, StatusFilter> = {
  0: 'active',
  1: 'past_due',
  2: 'canceled',
};

export function ScriptAIOverview() {
  const [tabValue, setTabValue] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [currencyView, setCurrencyView] = useState<'BOTH' | 'USD' | 'GBP'>('BOTH');

  // API state
  const [metrics, setMetrics] = useState<SubscriberMetrics | null>(null);
  const [subscriberData, setSubscriberData] = useState<SubscriberListResponse | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingSubscribers, setLoadingSubscribers] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [subscribersError, setSubscribersError] = useState<string | null>(null);

  // Credit dialog state
  const [creditDialogOpen, setCreditDialogOpen] = useState(false);
  const [creditUserId, setCreditUserId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditLoading, setCreditLoading] = useState(false);

  // Action loading state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Debounce search
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
      {
        status: TAB_TO_STATUS[tabValue],
        search: debouncedSearch || undefined,
      },
      signal,
    );
    if (!signal?.aborted) {
      setSubscriberData(data);
      setSubscribersError(error);
      setLoadingSubscribers(false);
    }
  }, [tabValue, debouncedSearch]);

  useEffect(() => {
    const controller = new AbortController();
    fetchMetrics(controller.signal);
    return () => controller.abort();
  }, [fetchMetrics]);

  useEffect(() => {
    const controller = new AbortController();
    fetchSubscribers(controller.signal);
    return () => controller.abort();
  }, [fetchSubscribers]);

  const handleBlock = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await adminApi.blockSubscriber(userId);
    setActionLoading(null);
    if (!error) fetchSubscribers();
  };

  const handleUnblock = async (userId: string) => {
    setActionLoading(userId);
    const { error } = await adminApi.unblockSubscriber(userId);
    setActionLoading(null);
    if (!error) fetchSubscribers();
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
      fetchSubscribers();
    }
  };

  // Derived display values from metrics
  const mrrDisplay =
    currencyView === 'USD'
      ? `$${(metrics?.mrr_usd ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
      : currencyView === 'GBP'
      ? `£${(metrics?.mrr_gbp ?? 0).toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
      : 'Multi Currency';

  const mrrSubtext =
    currencyView === 'BOTH'
      ? `$${(metrics?.mrr_usd ?? 0).toLocaleString()} USD + £${(metrics?.mrr_gbp ?? 0).toLocaleString()} GBP`
      : '';

  const stats = [
    {
      label: 'Total Paid Users',
      value: metrics?.total_paid_users?.toString() ?? 'N/A',
      change: '',
      icon: <People />,
      color: '#D4AF37',
    },
    {
      label: 'Monthly Recurring Revenue',
      value: mrrDisplay,
      change: mrrSubtext,
      icon: <AttachMoney />,
      color: '#66bb6a',
    },
    {
      label: 'Reports Generated (MTD)',
      value: metrics?.reports_this_month_total?.toLocaleString() ?? 'N/A',
      change: metrics
        ? `${metrics.reports_this_month_free.toLocaleString()} free, ${metrics.reports_this_month_paid.toLocaleString()} paid`
        : '',
      icon: <Description />,
      color: '#42a5f5',
    },
    {
      label: 'Avg. Reports per User',
      value: metrics?.avg_reports_per_user?.toFixed(1) ?? 'N/A',
      change: 'Per paid user',
      icon: <TrendingUp />,
      color: '#ffa726',
    },
  ];

  const planColors: Record<string, string> = {
    Free: '#666',
    'Pro Monthly': '#42a5f5',
    Studio: '#66bb6a',
  };

  const counts = subscriberData?.counts ?? { active: 0, past_due: 0, canceled: 0 };
  const subscribers = subscriberData?.items ?? [];

  if (loadingMetrics && loadingSubscribers) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  return (
    <Box>
      {metricsError && <Alert severity="error" sx={{ mb: 2 }}>{metricsError}</Alert>}

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 1 }}>
              Paid Users & Subscription Overview
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
              Monitor subscriber activity, revenue, and usage metrics
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {(['BOTH', 'USD', 'GBP'] as const).map((cv) => (
              <Button
                key={cv}
                size="small"
                variant={currencyView === cv ? 'contained' : 'outlined'}
                onClick={() => setCurrencyView(cv)}
                sx={{
                  borderColor: '#D4AF37',
                  color: currencyView === cv ? '#000000' : '#D4AF37',
                  bgcolor: currencyView === cv ? '#D4AF37' : 'transparent',
                  '&:hover': {
                    borderColor: '#D4AF37',
                    bgcolor: currencyView === cv ? '#D4AF37' : 'rgba(212, 175, 55, 0.08)',
                  },
                }}
              >
                {cv === 'BOTH' ? 'Both Currencies' : `${cv} Only`}
              </Button>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              sx={{
                bgcolor: '#0a0a0a',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                '&:hover': { borderColor: 'rgba(212, 175, 55, 0.4)' },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: `${stat.color}20`,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box sx={{ color: stat.color }}>{stat.icon}</Box>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#ffffff', mb: 0.5 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1 }}>
                      {stat.label}
                    </Typography>
                    {stat.change && (
                      <Typography variant="caption" sx={{ color: stat.color, fontWeight: 600 }}>
                        {stat.change}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Plan Distribution */}
      <Card
        sx={{
          mb: 4,
          bgcolor: '#0a0a0a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        }}
      >
        <CardContent>
          <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 600, mb: 3 }}>
            Plan Distribution & Revenue Breakdown
          </Typography>
          <Grid container spacing={3}>
            {(metrics?.plan_distribution ?? []).map((plan, index) => {
              const color = planColors[plan.plan] ?? '#D4AF37';
              return (
                <Grid size={{ xs: 12, md: Math.max(3, Math.floor(12 / (metrics?.plan_distribution.length ?? 3))) }} key={index}>
                  <Box
                    sx={{
                      p: 2,
                      bgcolor: 'rgba(212, 175, 55, 0.05)',
                      borderRadius: 2,
                      border: `1px solid ${color}40`,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: color,
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600 }}>
                        {plan.plan}
                      </Typography>
                    </Box>
                    <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 700, mb: 0.5 }}>
                      {plan.user_count}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                      Users
                    </Typography>
                    {plan.revenue > 0 && (
                      <>
                        <Typography
                          variant="h6"
                          sx={{ color: '#66bb6a', fontWeight: 700, mt: 2, mb: 0.5 }}
                        >
                          ${plan.revenue.toLocaleString()}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                          Monthly Revenue
                        </Typography>
                      </>
                    )}
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Paid Users Table */}
      <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 600 }}>
              Paid Subscribers
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              size="small"
              sx={{
                borderColor: '#D4AF37',
                color: '#D4AF37',
                '&:hover': {
                  borderColor: '#D4AF37',
                  bgcolor: 'rgba(212, 175, 55, 0.08)',
                },
              }}
            >
              Export CSV
            </Button>
          </Box>

          <TextField
            fullWidth
            placeholder="Search by name, email, or company..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#666' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2 }}
          />

          <Tabs
            value={tabValue}
            onChange={(_, newValue) => setTabValue(newValue)}
            sx={{
              '& .MuiTab-root': {
                color: '#a0a0a0',
                textTransform: 'none',
                fontWeight: 600,
              },
              '& .Mui-selected': {
                color: '#D4AF37 !important',
              },
              '& .MuiTabs-indicator': {
                backgroundColor: '#D4AF37',
              },
            }}
          >
            <Tab label={`Active (${counts.active})`} />
            <Tab label={`Past Due (${counts.past_due})`} />
            <Tab label={`Canceled (${counts.canceled})`} />
          </Tabs>
        </Box>

        {subscribersError && <Alert severity="error" sx={{ m: 2 }}>{subscribersError}</Alert>}

        {loadingSubscribers ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress sx={{ color: '#D4AF37' }} />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>User</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Company</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Plan</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Usage</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Monthly Spend</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Join Date</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Last Active</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Status</TableCell>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subscribers.map((user) => (
                  <SubscriberRow
                    key={user.id}
                    user={user}
                    actionLoading={actionLoading}
                    onBlock={handleBlock}
                    onUnblock={handleUnblock}
                    onCredit={(id) => {
                      setCreditUserId(id);
                      setCreditDialogOpen(true);
                    }}
                  />
                ))}
                {subscribers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={{ textAlign: 'center', color: '#a0a0a0', py: 4 }}>
                      No subscribers found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Credit Dialog */}
      <Dialog
        open={creditDialogOpen}
        onClose={() => setCreditDialogOpen(false)}
        PaperProps={{ sx: { bgcolor: '#1a1a1a', border: '1px solid rgba(212, 175, 55, 0.3)' } }}
      >
        <DialogTitle sx={{ color: '#D4AF37' }}>Adjust Report Credits</DialogTitle>
        <DialogContent>
          <TextField
            label="Credit Adjustment"
            type="number"
            fullWidth
            value={creditAmount}
            onChange={(e) => setCreditAmount(e.target.value)}
            helperText="Positive to add, negative to deduct"
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            label="Reason (optional)"
            fullWidth
            value={creditReason}
            onChange={(e) => setCreditReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreditDialogOpen(false)} sx={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button
            onClick={handleCreditSubmit}
            disabled={!creditAmount || creditLoading}
            sx={{ color: '#D4AF37' }}
          >
            {creditLoading ? <CircularProgress size={20} sx={{ color: '#D4AF37' }} /> : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function SubscriberRow({
  user,
  actionLoading,
  onBlock,
  onUnblock,
  onCredit,
}: {
  user: Subscriber;
  actionLoading: string | null;
  onBlock: (id: string) => void;
  onUnblock: (id: string) => void;
  onCredit: (id: string) => void;
}) {
  const unlimited = user.report_limit === null;
  const usagePercent = unlimited
    ? 100
    : user.report_limit! > 0
    ? (user.reports_this_month / user.report_limit!) * 100
    : 0;

  const planChipColor =
    user.plan === 'Studio'
      ? { bg: 'rgba(102, 187, 106, 0.2)', text: '#66bb6a' }
      : user.plan === 'Pro Monthly'
      ? { bg: 'rgba(66, 165, 245, 0.2)', text: '#42a5f5' }
      : { bg: 'rgba(212, 175, 55, 0.2)', text: '#D4AF37' };

  const statusChipColor =
    user.status === 'Active'
      ? { bg: 'rgba(46, 125, 50, 0.2)', text: '#66bb6a' }
      : user.status === 'Past Due'
      ? { bg: 'rgba(255, 152, 0, 0.2)', text: '#ffa726' }
      : { bg: 'rgba(158, 158, 158, 0.2)', text: '#9e9e9e' };

  const isBlocked = user.status === 'Canceled';
  const isLoading = actionLoading === user.id;

  return (
    <TableRow sx={{ '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              width: 36,
              height: 36,
              fontSize: '0.875rem',
              fontWeight: 600,
            }}
          >
            {user.name
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 600 }}>
              {user.name}
            </Typography>
            <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
              {user.email}
            </Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell sx={{ color: '#ffffff', fontSize: '0.875rem' }}>{user.company}</TableCell>
      <TableCell>
        <Chip
          label={user.plan}
          size="small"
          icon={user.plan === 'Studio' ? <Star sx={{ fontSize: 14 }} /> : undefined}
          sx={{ bgcolor: planChipColor.bg, color: planChipColor.text, fontWeight: 600 }}
        />
      </TableCell>
      <TableCell>
        <Box sx={{ minWidth: 120 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
              {user.reports_this_month}/{unlimited ? '∞' : user.report_limit}
            </Typography>
            <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 600 }}>
              {unlimited ? '100' : Math.round(usagePercent)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(usagePercent, 100)}
            sx={{
              bgcolor: 'rgba(212, 175, 55, 0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: unlimited || usagePercent < 80 ? '#D4AF37' : '#ffa726',
              },
            }}
          />
          <Typography variant="caption" sx={{ color: '#666', mt: 0.5, display: 'block' }}>
            {user.total_reports_generated} total reports
          </Typography>
        </Box>
      </TableCell>
      <TableCell sx={{ color: '#66bb6a', fontWeight: 600, fontSize: '0.875rem' }}>
        {user.payment_currency === 'GBP' ? '£' : '$'}
        {user.monthly_spend}/mo
      </TableCell>
      <TableCell sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>{user.join_date}</TableCell>
      <TableCell sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>{user.last_active ?? 'N/A'}</TableCell>
      <TableCell>
        <Chip
          icon={user.status === 'Active' ? <CheckCircle sx={{ fontSize: 14 }} /> : undefined}
          label={user.status}
          size="small"
          sx={{ bgcolor: statusChipColor.bg, color: statusChipColor.text, fontWeight: 600 }}
        />
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="View">
            <IconButton size="small">
              <Visibility sx={{ color: '#D4AF37', fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Adjust credits">
            <IconButton size="small" onClick={() => onCredit(user.id)}>
              <CreditCard sx={{ color: '#42a5f5', fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          {!isBlocked && (
            <Tooltip title="Block user">
              <IconButton size="small" onClick={() => onBlock(user.id)} disabled={isLoading}>
                {isLoading ? (
                  <CircularProgress size={18} sx={{ color: '#f44336' }} />
                ) : (
                  <Block sx={{ color: '#f44336', fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
          {isBlocked && (
            <Tooltip title="Unblock user">
              <IconButton size="small" onClick={() => onUnblock(user.id)} disabled={isLoading}>
                {isLoading ? (
                  <CircularProgress size={18} sx={{ color: '#66bb6a' }} />
                ) : (
                  <LockOpen sx={{ color: '#66bb6a', fontSize: 18 }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </TableCell>
    </TableRow>
  );
}
