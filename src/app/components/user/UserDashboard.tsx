import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  IconButton,
  LinearProgress,
  CircularProgress,
  Divider,
  Grid,
} from '@mui/material';

import {
  Download,
  Settings,
  FileDownload,
  Visibility,
  Delete,
  Movie,
  Home,
  Compare,
  Calculate,
  Timeline,
  Visibility as VisibilityIcon,
  BarChart,
  CreditCard,
  Logout,
  Receipt,
  OpenInNew,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { apiClient } from '@/services/api';
import { downloadReportPDF } from '@/services/report-pdf.service';
import { getCustomerPortalUrl } from '@/services/stripe.service';
import { authService } from '@/services/auth.service';
import { WhatIfCalculator } from '@/app/components/user/WhatIfCalculator';
import { TerritoryComparison } from '@/app/components/user/TerritoryComparison';
import { ProductionTimeline } from '@/app/components/user/ProductionTimeline';
import { SupportContactWidget } from '@/app/components/user/SupportContactWidget';
import { useCurrentSubscription } from '@/app/hooks/useCurrentSubscription';
import { useSnackbar } from 'notistack';

const PLAN_LABEL: Record<string, string> = {
  free: 'Explorer',
  professional: 'Professional',
  producer: 'Producer',
  studio: 'Studio',
};

function formatGraceDeadline(pastDueSinceIso: string): string {
  const start = new Date(pastDueSinceIso);
  if (Number.isNaN(start.getTime())) return '';
  const deadline = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return deadline.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatRenewalDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

interface InvoiceItem {
  id: string;
  number: string | null;
  status: string;
  amount_paid: number;
  amount_due: number;
  currency: string;
  created: number | null;
  period_start: number | null;
  period_end: number | null;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  description: string | null;
}

interface UsageData {
  plan: string;
  reports_used: number;
  reports_limit: number | null;
  reports_remaining: number | null;
  credits_remaining: number;
  period_start: string | null;
  period_end: string | null;
  can_generate: boolean;
  reason: string;
}

interface ReportSummary {
  id: string;
  title: string;
  createdAt: string;
  reportType: string;
  topTerritory: string;
  status: 'Completed' | 'Failed' | 'Pending';
  pdfUrl?: string | null;
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ py: 3 }}>{children}</Box>}</div>;
}

type AnalysisPayload = {
  error?: string;
  topRecommendation?: string;
  executiveSummary?: {
    recommendedTerritories?: string[];
  };
  locationRankings?: Array<{
    name?: string;
    country?: string;
  }>;
};

type ReportApiResponse = {
  id: string;
  title?: string;
  script_title?: string;
  createdAt?: string;
  created_at?: string;
  reportType?: string;
  report_type?: string;
  analysis?: AnalysisPayload | null;
  report_data?: AnalysisPayload | null;
  pdfUrl?: string | null;
  pdf_url?: string | null;
};

function normalizeDate(value: string): string {
  if (!value) return 'N/A';
  const isoLikeValue = value.includes(' ') ? value.replace(' ', 'T') : value;
  const parsed = new Date(isoLikeValue);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
}

const tableChipBaseSx = {
  height: 28,
  borderRadius: '999px',
  borderWidth: 1,
  borderStyle: 'solid',
  fontWeight: 700,
  fontSize: '0.78rem',
  letterSpacing: '0.01em',
  '& .MuiChip-label': {
    px: 1.2,
  },
} as const;

const neutralTableChipSx = {
  ...tableChipBaseSx,
  bgcolor: 'rgba(212, 175, 55, 0.16)',
  color: '#D4AF37',
  borderColor: 'rgba(212, 175, 55, 0.32)',
} as const;

function getStatusChipSx(status: ReportSummary['status']) {
  const statusChipBase = {
    ...tableChipBaseSx,
    minWidth: 104,
    justifyContent: 'center',
    '& .MuiChip-label': {
      px: 1.2,
      width: '100%',
      textAlign: 'center',
    },
  };

  if (status === 'Completed') {
    return {
      ...statusChipBase,
      bgcolor: 'rgba(76, 175, 80, 0.14)',
      color: '#57d35f',
      borderColor: 'rgba(76, 175, 80, 0.55)',
    };
  }
  if (status === 'Failed') {
    return {
      ...statusChipBase,
      bgcolor: 'rgba(244, 67, 54, 0.14)',
      color: '#ff5f57',
      borderColor: 'rgba(244, 67, 54, 0.55)',
    };
  }
  return {
    ...statusChipBase,
    bgcolor: 'rgba(255, 193, 7, 0.14)',
    color: '#ffc247',
    borderColor: 'rgba(255, 193, 7, 0.55)',
  };
}

export function UserDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, setUser, userLogout } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [currentTab, setCurrentTab] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);
  const [managingSubscription, setManagingSubscription] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await userLogout();
    navigate('/');
  };
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoicesLoaded, setInvoicesLoaded] = useState(false);

  const {
    data: subscriptionData,
    refetch: refetchSubscription,
  } = useCurrentSubscription(!!user);
  const subscription = subscriptionData?.subscription ?? null;
  const pendingPlan = subscriptionData?.pending_plan ?? null;
  const pastDueSince = subscriptionData?.past_due_since ?? null;
  const subCancelAtPeriodEnd = !!subscriptionData?.cancel_at_period_end;

  // Handle payment success redirect
  useEffect(() => {
    if (searchParams.get('credit') === 'success') {
      searchParams.delete('credit');
      setSearchParams(searchParams, { replace: true });
      // Poll until credits_remaining increments (webhook lag)
      const pollForCredit = async () => {
        const MAX_ATTEMPTS = 6;
        const DELAY_MS = 2000;
        const initialCredits = user?.reportsLimit ?? 0;
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          await new Promise(res => setTimeout(res, DELAY_MS));
          const currentUser = await authService.getCurrentUser();
          if (currentUser && (currentUser.credits_remaining ?? 0) > initialCredits) {
            if (user) setUser({ ...user, reportsLimit: currentUser.credits_remaining ?? 0 });
            enqueueSnackbar('Report credit added! Upload a script to generate your report.', { variant: 'success' });
            return;
          }
        }
        enqueueSnackbar('Payment received! Your credit will appear shortly, refresh if needed.', { variant: 'info' });
      };
      pollForCredit();
    }

    if (searchParams.get('subscription') === 'success') {
      const expectedPlan = searchParams.get('plan');
      searchParams.delete('subscription');
      searchParams.delete('plan');
      setSearchParams(searchParams, { replace: true });

      // Stripe webhook lag is real (typically 200ms–10s). Poll /me until plan
      // moves off 'free' (or matches the expected upgraded plan), then sync
      // both auth context and the subscription card. Never claim success on
      // a stale 'free' read — that produced the "Welcome to Free" bug.
      enqueueSnackbar('Payment received! Activating your subscription…', { variant: 'info' });
      const pollForActivation = async () => {
        const MAX_ATTEMPTS = 15;
        const DELAY_MS = 2000;
        for (let i = 0; i < MAX_ATTEMPTS; i++) {
          await new Promise((res) => setTimeout(res, DELAY_MS));
          const currentUser = await authService.getCurrentUser();
          if (!currentUser?.plan) continue;
          const normalizedPlan = currentUser.plan === 'single' ? 'professional' : currentUser.plan;
          const matched = expectedPlan
            ? normalizedPlan === expectedPlan
            : normalizedPlan !== 'free';
          if (!matched) continue;

          setUser({
            email: currentUser.email,
            plan: normalizedPlan as any,
            reportsUsed: 0,
            reportsLimit: currentUser.credits_remaining || 0,
          });
          await refetchSubscription();
          const planLabel = normalizedPlan.charAt(0).toUpperCase() + normalizedPlan.slice(1);
          enqueueSnackbar(`Welcome to ${planLabel}.`, { variant: 'success' });
          return;
        }
        // Webhook didn't propagate within ~30s. Don't pretend it succeeded —
        // tell the user payment landed and prompt a refresh.
        enqueueSnackbar(
          'Payment received! Your plan will update in a moment, refresh if needed.',
          { variant: 'info' },
        );
      };
      void pollForActivation();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManageSubscription = async () => {
    setManagingSubscription(true);
    try {
      const customerId = subscription?.stripe_customer_id;
      if (customerId) {
        const { url } = await getCustomerPortalUrl(customerId);
        if (url) {
          window.location.href = url;
          return;
        }
      }
      enqueueSnackbar('Unable to open subscription management. Please try again.', { variant: 'error' });
    } catch {
      enqueueSnackbar('Failed to load subscription details.', { variant: 'error' });
    } finally {
      setManagingSubscription(false);
    }
  };

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const data = await apiClient.get<UsageData>('/api/subscriptions/usage', { auth: true });
        setUsageData(data);
      } catch {
        // Non-fatal — usage widget just won't render
      } finally {
        setUsageLoading(false);
      }
    };
    if (user) fetchUsage();
    else setUsageLoading(false);
  }, [user]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const data = await apiClient.get<ReportApiResponse[]>('/api/reports', { auth: true });
        const mapped: ReportSummary[] = data.map((report) => {
          const analysis = report.analysis || report.report_data;
          const errorMessage = analysis?.error;
          const status: ReportSummary['status'] = errorMessage
            ? 'Failed'
            : analysis
              ? 'Completed'
              : 'Pending';

          return {
            id: report.id,
            title: report.title || report.script_title || 'Untitled',
            createdAt: report.createdAt || report.created_at || '',
            reportType: (report.reportType || report.report_type || 'unknown').toUpperCase(),
            topTerritory:
              analysis?.locationRankings?.[0]?.name ||
              analysis?.locationRankings?.[0]?.country ||
              analysis?.executiveSummary?.recommendedTerritories?.[0] ||
              analysis?.topRecommendation ||
              'N/A',
            status,
            pdfUrl: report.pdfUrl || report.pdf_url || null,
          };
        });
        setReports(mapped);
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    // Lazy-load invoices the first time the Account tab (index 4) is opened
    if (newValue === 4 && !invoicesLoaded && user) {
      setInvoicesLoading(true);
      apiClient
        .get<{ invoices: InvoiceItem[] }>('/api/subscriptions/invoices', { auth: true })
        .then((data) => setInvoices(data.invoices || []))
        .catch(() => setInvoices([]))
        .finally(() => {
          setInvoicesLoading(false);
          setInvoicesLoaded(true);
        });
    }
  };

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#000000' }}>
      {/* Header */}
      <Box sx={{ bgcolor: '#0a0a0a', borderBottom: '1px solid rgba(212, 175, 55, 0.2)', py: { xs: 2, sm: 3 } }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1.5, sm: 3 } }}>
              <Avatar sx={{ width: { xs: 44, sm: 64 }, height: { xs: 44, sm: 64 }, bgcolor: '#D4AF37', color: '#000', fontWeight: 700, fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                {user?.email?.substring(0, 2).toUpperCase() || 'U'}
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 700, color: '#D4AF37', mb: 0.5, fontSize: { xs: '1.1rem', sm: '1.5rem', md: '2rem' } }}>Dashboard</Typography>
                <Typography variant="body2" sx={{ color: '#a0a0a0', mb: 1, display: { xs: 'none', sm: 'block' } }}>{user?.email}</Typography>
                <Chip label={user?.plan?.toUpperCase() || 'FREE'} size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37', fontWeight: 600 }} />
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button startIcon={<Home />} onClick={() => navigate('/')} sx={{ color: '#a0a0a0', display: { xs: 'none', sm: 'flex' } }}>Back to Home</Button>
              <Button variant="contained" startIcon={<Movie />} onClick={() => navigate('/upload')} sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>New Analysis</Button>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3, md: 4 }, mt: { xs: 2, sm: 4 } }}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}><BarChart sx={{ color: '#D4AF37' }} /><Typography variant="h6">Reports Generated</Typography></Box>
                <Typography variant="h3" sx={{ color: '#D4AF37', fontWeight: 700 }}>{reports.length}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}><CreditCard sx={{ color: '#D4AF37' }} /><Typography variant="h6">Credits Remaining</Typography></Box>
                <Typography variant="h3" sx={{ color: '#D4AF37', fontWeight: 700 }}>{user?.reportsLimit || 0}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}><VisibilityIcon sx={{ color: '#D4AF37' }} /><Typography variant="h6">Active Projects</Typography></Box>
                <Typography variant="h3" sx={{ color: '#D4AF37', fontWeight: 700 }}>{reports.length}</Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Plan Usage Card */}
          <Grid size={{ xs: 12 }}>
            <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <BarChart sx={{ color: '#D4AF37' }} />
                    <Typography variant="h6">Plan Usage</Typography>
                    {usageData && (
                      <Chip
                        label={usageData.plan.charAt(0).toUpperCase() + usageData.plan.slice(1)}
                        size="small"
                        sx={{ bgcolor: 'rgba(212, 175, 55, 0.15)', color: '#D4AF37', fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  {usageData?.period_end && (
                    <Typography variant="caption" sx={{ color: '#666' }}>
                      Resets {formatRenewalDate(usageData.period_end)}
                    </Typography>
                  )}
                </Box>

                {usageLoading ? (
                  <LinearProgress sx={{ height: 6, borderRadius: 3, bgcolor: '#1a1a1a', '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } }} />
                ) : usageData ? (
                  <Box>
                    {usageData.reports_limit === null ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                          {usageData.reports_used} report{usageData.reports_used !== 1 ? 's' : ''} generated this period
                        </Typography>
                        <Chip label="Unlimited" size="small" sx={{ bgcolor: 'rgba(76,175,80,0.15)', color: '#4caf50', fontWeight: 600, fontSize: '0.65rem' }} />
                      </Box>
                    ) : (
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                            {usageData.reports_used} / {usageData.reports_limit} reports used this period
                          </Typography>
                          <Typography variant="body2" sx={{ color: usageData.can_generate ? '#4caf50' : '#f44336', fontWeight: 600 }}>
                            {usageData.reports_remaining} remaining
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(100, (usageData.reports_used / usageData.reports_limit) * 100)}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#1a1a1a',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: usageData.reports_used >= usageData.reports_limit ? '#f44336' : '#D4AF37',
                              borderRadius: 4,
                            },
                          }}
                        />
                        {usageData.reports_used >= usageData.reports_limit && (
                          <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                            <Typography variant="caption" sx={{ color: '#f44336' }}>Monthly limit reached.</Typography>
                            {usageData.credits_remaining > 0 ? (
                              <Typography variant="caption" sx={{ color: '#D4AF37' }}>
                                {usageData.credits_remaining} pay per report credit{usageData.credits_remaining !== 1 ? 's' : ''} available as overflow.
                              </Typography>
                            ) : (
                              <Button size="small" variant="outlined" onClick={() => navigate('/pricing')} sx={{ color: '#D4AF37', borderColor: '#D4AF37', fontSize: '0.7rem', py: 0.25 }}>
                                Buy a credit or upgrade
                              </Button>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                    {usageData.credits_remaining > 0 && usageData.reports_limit !== null && usageData.reports_used < usageData.reports_limit && (
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1 }}>
                        + {usageData.credits_remaining} pay per report credit{usageData.credits_remaining !== 1 ? 's' : ''} available
                      </Typography>
                    )}
                    {usageData.reports_limit === null && usageData.credits_remaining > 0 && (
                      <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>
                        + {usageData.credits_remaining} pay per report credit{usageData.credits_remaining !== 1 ? 's' : ''} on account
                      </Typography>
                    )}
                  </Box>
                ) : (
                  <Typography variant="body2" sx={{ color: '#666' }}>Usage data unavailable</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Box sx={{ borderBottom: 1, borderColor: 'rgba(212, 175, 55, 0.2)' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              '& .MuiTab-root': { color: '#a0a0a0', minWidth: { xs: 'auto', sm: 120 }, px: { xs: 1.5, sm: 2 }, fontSize: { xs: '0.75rem', sm: '0.875rem' } },
              '& .Mui-selected': { color: '#D4AF37 !important' },
              '& .MuiTabs-indicator': { bgcolor: '#D4AF37' },
              '& .MuiTabScrollButton-root': { color: '#a0a0a0' },
            }}
          >
            <Tab icon={<Download />} iconPosition="start" label="Reports" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
            <Tab icon={<Compare />} iconPosition="start" label="Territories" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
            <Tab icon={<Calculate />} iconPosition="start" label="What If" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
            <Tab icon={<Timeline />} iconPosition="start" label="Timeline" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
            <Tab icon={<Settings />} iconPosition="start" label="Account" sx={{ '& .MuiTab-iconWrapper': { display: { xs: 'none', sm: 'block' } } }} />
          </Tabs>
        </Box>

        <TabPanel value={currentTab} index={0}>
          {loading ? <LinearProgress sx={{ mt: 2, bgcolor: 'rgba(212, 175, 55, 0.2)', '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } }} /> : (
            <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', mt: 2 }}>
              {reports.length === 0 ? (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 2 }}>No reports found. Start by uploading a script.</Typography>
                  <Button variant="outlined" onClick={() => navigate('/upload')}>Upload First Script</Button>
                </Box>
              ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table sx={{ minWidth: 600 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap' }}>Project Title</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap', display: { xs: 'none', sm: 'table-cell' } }}>Type</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap' }}>Date</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap', display: { xs: 'none', md: 'table-cell' } }}>Top Territory</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap' }}>Status</TableCell>
                        <TableCell sx={{ color: '#D4AF37', whiteSpace: 'nowrap' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reports.map((report) => (
                        <TableRow key={report.id} sx={{ '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}>
                          <TableCell sx={{ color: '#fff', fontWeight: 600, maxWidth: { xs: 120, sm: 'none' }, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{report.title}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                            <Chip
                              label={report.reportType}
                              size="small"
                              sx={neutralTableChipSx}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#a0a0a0', whiteSpace: 'nowrap' }}>{normalizeDate(report.createdAt)}</TableCell>
                          <TableCell sx={{ display: { xs: 'none', md: 'table-cell' } }}>
                            <Chip
                              label={report.topTerritory}
                              size="small"
                              sx={neutralTableChipSx}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={report.status}
                              size="small"
                              sx={getStatusChipSx(report.status)}
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              <IconButton size="small" sx={{ color: '#D4AF37' }} onClick={() => navigate(`/report/${report.id}`)}><Visibility fontSize="small" /></IconButton>
                              <IconButton
                                size="small"
                                sx={{ color: report.pdfUrl ? '#D4AF37' : '#666' }}
                                disabled={!report.pdfUrl || downloadingId === report.id}
                                onClick={async () => {
                                  if (!report.pdfUrl) return;
                                  setDownloadingId(report.id);
                                  try {
                                    await downloadReportPDF(report.id, report.title);
                                  } catch (error) {
                                    console.error('PDF download failed:', error);
                                  } finally {
                                    setDownloadingId(null);
                                  }
                                }}
                              >
                                {downloadingId === report.id ? (
                                  <CircularProgress size={18} sx={{ color: '#D4AF37' }} />
                                ) : (
                                  <FileDownload fontSize="small" />
                                )}
                              </IconButton>
                              <IconButton size="small" sx={{ color: '#666' }}><Delete fontSize="small" /></IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Paper>
          )}
        </TabPanel>

        <TabPanel value={currentTab} index={1}><TerritoryComparison /></TabPanel>
        <TabPanel value={currentTab} index={2}><WhatIfCalculator /></TabPanel>
        <TabPanel value={currentTab} index={3}>
          <ProductionTimeline
            userPlan={(user?.plan as 'free' | 'professional' | 'studio') || 'free'}
            reports={reports.filter((r) => r.status === 'Completed').map((r) => ({ id: r.id, title: r.title }))}
          />
        </TabPanel>
        <TabPanel value={currentTab} index={4}>
          <Paper sx={{ p: 4, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', mt: 2 }}>
            <Typography variant="h6" sx={{ color: '#D4AF37', mb: 3 }}>Account Settings</Typography>
            <Divider sx={{ mb: 3, borderColor: '#222' }} />
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>Email Address</Typography>
                <Typography variant="body1" sx={{ color: '#fff' }}>{user?.email}</Typography>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="caption" sx={{ color: '#666' }}>Active Subscription</Typography>
                <Typography variant="body1" sx={{ color: '#fff', mb: 0.5 }}>{user?.plan?.toUpperCase() || 'FREE'}</Typography>

                {subscription?.current_period_end && (
                  <Typography variant="caption" sx={{ color: '#888', display: 'block', mb: 1 }}>
                    Renews {formatRenewalDate(String(subscription.current_period_end))}
                  </Typography>
                )}

                {pendingPlan && (
                  <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.3)' }}>
                    <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 600 }}>
                      Switching to {PLAN_LABEL[pendingPlan] ?? pendingPlan}
                      {subscription?.current_period_end ? ` on ${formatRenewalDate(String(subscription.current_period_end))}` : ' at next renewal'}
                    </Typography>
                  </Box>
                )}

                {subCancelAtPeriodEnd && !pendingPlan && (
                  <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'rgba(255,193,7,0.08)', border: '1px solid rgba(255,193,7,0.3)' }}>
                    <Typography variant="caption" sx={{ color: '#ffc247', fontWeight: 600 }}>
                      Subscription ends
                      {subscription?.current_period_end ? ` ${formatRenewalDate(String(subscription.current_period_end))}` : ' at the end of this period'}
                    </Typography>
                  </Box>
                )}

                {pastDueSince && (
                  <Box sx={{ mb: 1.5, p: 1.5, borderRadius: 1, bgcolor: 'rgba(244,67,54,0.1)', border: '1px solid rgba(244,67,54,0.4)' }}>
                    <Typography variant="caption" sx={{ color: '#f6c6c4', fontWeight: 600, display: 'block' }}>
                      Last payment failed
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#f6c6c4' }}>
                      Update your payment method by {formatGraceDeadline(pastDueSince)} to keep your subscription.
                    </Typography>
                  </Box>
                )}

                {user?.plan !== 'free' ? (
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => navigate('/pricing')}
                      sx={{ borderColor: '#D4AF37', color: '#D4AF37', '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.08)' } }}
                    >
                      Change plan
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={managingSubscription ? <CircularProgress size={14} sx={{ color: '#D4AF37' }} /> : <CreditCard />}
                      onClick={handleManageSubscription}
                      disabled={managingSubscription}
                      sx={{ borderColor: '#D4AF37', color: '#D4AF37', '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.08)' } }}
                    >
                      {managingSubscription ? 'Loading...' : 'Manage billing'}
                    </Button>
                  </Box>
                ) : (
                  <Button
                    variant="contained"
                    size="small"
                    onClick={() => navigate('/pricing')}
                    sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 600, '&:hover': { bgcolor: '#B8941F' } }}
                  >
                    Upgrade to Professional
                  </Button>
                )}
              </Grid>
            </Grid>
            <Divider sx={{ my: 4, borderColor: '#222' }} />

            {/* Billing History */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Receipt sx={{ color: '#D4AF37', fontSize: 20 }} />
                <Typography variant="h6" sx={{ color: '#D4AF37' }}>Invoice History</Typography>
              </Box>
              {invoicesLoading ? (
                <LinearProgress sx={{ height: 4, borderRadius: 2, bgcolor: '#1a1a1a', '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } }} />
              ) : invoices.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#666' }}>
                  {invoicesLoaded ? 'No invoices found.' : 'Open this tab to load your invoice history.'}
                </Typography>
              ) : (
                <TableContainer component={Paper} sx={{ bgcolor: '#111', border: '1px solid #222' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ color: '#D4AF37', fontWeight: 600, borderColor: '#222' }}>Invoice #</TableCell>
                        <TableCell sx={{ color: '#D4AF37', fontWeight: 600, borderColor: '#222' }}>Date</TableCell>
                        <TableCell sx={{ color: '#D4AF37', fontWeight: 600, borderColor: '#222' }}>Amount</TableCell>
                        <TableCell sx={{ color: '#D4AF37', fontWeight: 600, borderColor: '#222' }}>Status</TableCell>
                        <TableCell sx={{ color: '#D4AF37', fontWeight: 600, borderColor: '#222' }}>Download</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.map((inv) => {
                        const amountMajor = ((inv.status === 'paid' ? inv.amount_paid : inv.amount_due) / 100).toFixed(2);
                        const symbol = inv.currency === 'gbp' ? '£' : '$';
                        const dateStr = inv.created
                          ? new Date(inv.created * 1000).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
                          : 'N/A';
                        return (
                          <TableRow key={inv.id} sx={{ '&:hover': { bgcolor: 'rgba(212,175,55,0.04)' } }}>
                            <TableCell sx={{ color: '#a0a0a0', borderColor: '#1a1a1a', fontSize: '0.8rem' }}>
                              {inv.number || inv.id.slice(-8)}
                            </TableCell>
                            <TableCell sx={{ color: '#a0a0a0', borderColor: '#1a1a1a', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                              {dateStr}
                            </TableCell>
                            <TableCell sx={{ color: '#ffffff', borderColor: '#1a1a1a', fontWeight: 600, fontSize: '0.85rem' }}>
                              {symbol}{amountMajor}
                            </TableCell>
                            <TableCell sx={{ borderColor: '#1a1a1a' }}>
                              <Chip
                                label={inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                                size="small"
                                sx={{
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  ...(inv.status === 'paid'
                                    ? { bgcolor: 'rgba(76,175,80,0.15)', color: '#4caf50', border: '1px solid rgba(76,175,80,0.4)' }
                                    : { bgcolor: 'rgba(255,193,7,0.15)', color: '#ffc247', border: '1px solid rgba(255,193,7,0.4)' }),
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ borderColor: '#1a1a1a' }}>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {inv.hosted_invoice_url && (
                                  <IconButton
                                    size="small"
                                    component="a"
                                    href={inv.hosted_invoice_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ color: '#D4AF37' }}
                                    title="View invoice"
                                  >
                                    <OpenInNew fontSize="small" />
                                  </IconButton>
                                )}
                                {inv.invoice_pdf && (
                                  <IconButton
                                    size="small"
                                    component="a"
                                    href={inv.invoice_pdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ color: '#D4AF37' }}
                                    title="Download PDF"
                                  >
                                    <FileDownload fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>

            <Divider sx={{ my: 4, borderColor: '#222' }} />
            <Box>
              <Typography variant="caption" sx={{ color: '#666', display: 'block', mb: 1.5 }}>Session</Typography>
              <Button
                variant="outlined"
                startIcon={loggingOut ? <CircularProgress size={14} sx={{ color: '#f44336' }} /> : <Logout />}
                onClick={handleLogout}
                disabled={loggingOut}
                sx={{
                  borderColor: 'rgba(244, 67, 54, 0.4)',
                  color: '#f44336',
                  '&:hover': { borderColor: '#f44336', bgcolor: 'rgba(244, 67, 54, 0.08)' },
                  '&:disabled': { borderColor: '#333', color: '#666' },
                }}
              >
                {loggingOut ? 'Signing out…' : 'Sign Out'}
              </Button>
            </Box>
          </Paper>
        </TabPanel>
      </Box>
      <SupportContactWidget />
    </Box>
  );
}
