import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  CheckCircle,
  Warning,
  Sync,
  Schedule,
  Event,
  Upload,
  Download,
  Refresh,
  ExpandMore,
  ExpandLess,
  MonetizationOn,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type {
  Grant,
  CreateGrantPayload,
  BulkImportResult,
  PendingChange,
  SyncStatus,
  SyncSettings,
  SyncSettingsUpdate,
} from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

interface TabPanelProps {
  children?: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// Normalise a raw grant from the API — handles CSV-imported rows where the
// backend may return eligibility as a semicolon-separated string or null,
// and status/daysUntilDeadline may be absent if not computed server-side.
function normalizeGrant(raw: any): Grant {
  const deadline = new Date(raw.applicationDeadline || '');
  const opens = new Date(raw.applicationOpens || '');
  const now = new Date();
  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let status: Grant['status'] = raw.status;
  if (!status) {
    if (deadline < now) status = 'closed';
    else if (daysUntil <= 14) status = 'closing-soon';
    else if (opens <= now) status = 'open';
    else status = 'opening-soon';
  }

  const eligibility: string[] = Array.isArray(raw.eligibility)
    ? raw.eligibility
    : typeof raw.eligibility === 'string' && raw.eligibility
    ? raw.eligibility.split(';').map((s: string) => s.trim()).filter(Boolean)
    : [];

  const rawSource = typeof raw.dataSource === 'string' ? raw.dataSource : 'manual';
  const dataSource: Grant['dataSource'] = ['manual', 'rss', 'api', 'scrape'].includes(rawSource)
    ? rawSource as Grant['dataSource']
    : 'manual';

  return {
    ...raw,
    status,
    dataSource,
    eligibility,
    daysUntilDeadline: typeof raw.daysUntilDeadline === 'number' ? raw.daysUntilDeadline : daysUntil,
  };
}

export function GrantsManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canEditIncentiveData')) {
    return (
      <AdminAccessDenied
        requiredPermission="Edit Incentive Data"
        requiredRole="Master Admin, Senior Admin, or Data Admin"
      />
    );
  }

  return <GrantsManagerContent />;
}

function GrantsManagerContent() {
  const [currentTab, setCurrentTab] = useState(0);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [showPendingChanges, setShowPendingChanges] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const [syncSettingsForm, setSyncSettingsForm] = useState<SyncSettingsUpdate>({});
  const [syncSettingsLoading, setSyncSettingsLoading] = useState(false);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    (async () => {
      setLoading(true);
      setFetchError(null);
      setSyncErrorMessage(null);

      const [grantsRes, syncStatusRes, pendingRes] = await Promise.all([
        adminApi.getGrants(),
        adminApi.getGrantSyncStatus(),
        adminApi.getGrantPendingChanges(),
      ]);

      if (grantsRes.error) {
        setFetchError(grantsRes.error);
      } else {
        setGrants((grantsRes.data?.items ?? []).map(normalizeGrant));
      }

      if (syncStatusRes.error) {
        setSyncErrorMessage(syncStatusRes.error);
      } else if (syncStatusRes.data) {
        setSyncStatus(syncStatusRes.data);
      }

      if (pendingRes.error) {
        setSyncErrorMessage(pendingRes.error);
      } else if (pendingRes.data) {
        setPendingChanges(pendingRes.data);
      }

      setLoading(false);
    })();
  }, []);

  const loadGrants = async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await adminApi.getGrants();
    if (error) {
      setFetchError(error);
    } else {
      setGrants((data?.items ?? []).map(normalizeGrant));
    }
    setLoading(false);
  };

  const refreshSyncData = async () => {
    const [syncStatusRes, pendingRes] = await Promise.all([
      adminApi.getGrantSyncStatus(),
      adminApi.getGrantPendingChanges(),
    ]);

    if (syncStatusRes.error) {
      setSyncErrorMessage(syncStatusRes.error);
    } else if (syncStatusRes.data) {
      setSyncStatus(syncStatusRes.data);
    }

    if (pendingRes.error) {
      setSyncErrorMessage(pendingRes.error);
    } else if (pendingRes.data) {
      setPendingChanges(pendingRes.data);
    }
  };

  const [addGrantOpen, setAddGrantOpen] = useState(false);
  const [editGrantOpen, setEditGrantOpen] = useState(false);
  const [previewGrantOpen, setPreviewGrantOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null);
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    territory: '',
    fundingBody: '',
    maxAmount: '',
    currency: 'USD',
    applicationOpens: '',
    applicationDeadline: '',
    eligibility: '',
    websiteUrl: '',
    verified: false,
  });

  const territories = ['UK', 'Canada', 'USA', 'Malta', 'South Africa'];
  const currencies = ['GBP', 'USD', 'CAD', 'EUR', 'ZAR'];

  const getStatusColor = (status: Grant['status']) => {
    switch (status) {
      case 'opening-soon': return '#2196F3';
      case 'open': return '#4caf50';
      case 'closing-soon': return '#ff9800';
      case 'closed': return '#666666';
      default: return '#666666';
    }
  };

  const getStatusIcon = (status: Grant['status']) => {
    switch (status) {
      case 'opening-soon': return <Schedule />;
      case 'open': return <CheckCircle />;
      case 'closing-soon': return <Warning />;
      case 'closed': return <Event />;
      default: return <Event />;
    }
  };

  const handleAddGrant = async () => {
    const payload: CreateGrantPayload = {
      title: formData.title,
      territory: formData.territory,
      fundingBody: formData.fundingBody,
      maxAmount: formData.maxAmount,
      currency: formData.currency,
      applicationOpens: formData.applicationOpens,
      applicationDeadline: formData.applicationDeadline,
      status: calculateStatus(formData.applicationOpens, formData.applicationDeadline),
      daysUntilDeadline: calculateDaysUntilDeadline(formData.applicationDeadline),
      eligibility: formData.eligibility.split('\n').filter(e => e.trim()),
      websiteUrl: formData.websiteUrl,
      dataSource: 'manual',
      verified: formData.verified,
      isNew: true,
      lastVerifiedAt: formData.verified ? new Date().toISOString() : undefined,
    };
    const { data, error } = await adminApi.createGrant(payload);
    if (!error && data) {
      setGrants([...grants, data]);
    }
    setAddGrantOpen(false);
    resetForm();
  };

  const handleEditGrant = async () => {
    if (!selectedGrant) return;
    const payload: Partial<Grant> = {
      title: formData.title,
      territory: formData.territory,
      fundingBody: formData.fundingBody,
      maxAmount: formData.maxAmount,
      currency: formData.currency,
      applicationOpens: formData.applicationOpens,
      applicationDeadline: formData.applicationDeadline,
      status: calculateStatus(formData.applicationOpens, formData.applicationDeadline),
      daysUntilDeadline: calculateDaysUntilDeadline(formData.applicationDeadline),
      eligibility: formData.eligibility.split('\n').filter(e => e.trim()),
      websiteUrl: formData.websiteUrl,
      verified: formData.verified,
      lastVerifiedAt: formData.verified ? new Date().toISOString() : selectedGrant.lastVerifiedAt,
    };
    const { data, error } = await adminApi.updateGrant(selectedGrant.id, payload);
    if (!error && data) {
      setGrants(grants.map(g => g.id === selectedGrant.id ? data : g));
    }
    setEditGrantOpen(false);
    setSelectedGrant(null);
    resetForm();
  };

  const handleDeleteGrant = async () => {
    if (!selectedGrant) return;
    const { error } = await adminApi.deleteGrant(selectedGrant.id);
    if (!error) {
      setGrants(grants.filter(g => g.id !== selectedGrant.id));
    }
    setDeleteConfirmOpen(false);
    setSelectedGrant(null);
  };

  const openEditDialog = (grant: Grant) => {
    setSelectedGrant(grant);
    setFormData({
      title: grant.title,
      territory: grant.territory,
      fundingBody: grant.fundingBody,
      maxAmount: grant.maxAmount,
      currency: grant.currency,
      applicationOpens: grant.applicationOpens,
      applicationDeadline: grant.applicationDeadline,
      eligibility: grant.eligibility.join('\n'),
      websiteUrl: grant.websiteUrl,
      verified: grant.verified,
    });
    setEditGrantOpen(true);
  };

  const openPreviewDialog = (grant: Grant) => {
    setSelectedGrant(grant);
    setPreviewGrantOpen(true);
  };

  const openDeleteDialog = (grant: Grant) => {
    setSelectedGrant(grant);
    setDeleteConfirmOpen(true);
  };

  const toggleVerified = async (grantId: string) => {
    const target = grants.find(g => g.id === grantId);
    if (!target) return;
    const payload: Grant = {
      ...target,
      verified: !target.verified,
      lastVerifiedAt: !target.verified ? new Date().toISOString() : target.lastVerifiedAt,
    };
    const { data, error } = await adminApi.updateGrant(grantId, payload);
    if (!error && data) {
      setGrants(grants.map(g => g.id === grantId ? data : g));
    }
  };

  const handleTriggerSync = async () => {
    setSyncSuccessMessage(null);
    setSyncErrorMessage(null);
    setSyncing(true);

    const { error } = await adminApi.triggerGrantSync();

    setSyncing(false);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }

    setSyncSuccessMessage('Grant auto-sync started. New scraped diffs will appear after processing.');
    await refreshSyncData();
  };

  const handleApproveChange = async (change: PendingChange) => {
    const { error } = await adminApi.approveGrantPendingChange(change.id);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }

    const [grantsRes] = await Promise.all([
      adminApi.getGrants(),
      refreshSyncData(),
    ]);
    if (grantsRes.data) {
      setGrants((grantsRes.data.items ?? []).map(normalizeGrant));
    }
  };

  const handleRejectChange = async (change: PendingChange) => {
    const { error } = await adminApi.rejectGrantPendingChange(change.id);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }
    await refreshSyncData();
  };

  const handleOpenSyncSettings = async () => {
    setSyncDialogOpen(true);
    setSyncSettingsLoading(true);
    const { data, error } = await adminApi.getGrantSyncSettings();
    if (error) {
      setSyncErrorMessage(error);
    } else if (data) {
      setSyncSettings(data);
      setSyncSettingsForm({ schedule: data.schedule ?? undefined, enabled: data.enabled });
    }
    setSyncSettingsLoading(false);
  };

  const handleSaveSyncSettings = async () => {
    const { data, error } = await adminApi.updateGrantSyncSettings(syncSettingsForm);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }
    if (data) {
      setSyncSettings(data);
      setSyncDialogOpen(false);
    }
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      territory: '',
      fundingBody: '',
      maxAmount: '',
      currency: 'USD',
      applicationOpens: '',
      applicationDeadline: '',
      eligibility: '',
      websiteUrl: '',
      verified: false,
    });
  };

  const calculateStatus = (opens: string, deadline: string): Grant['status'] => {
    const now = new Date();
    const openDate = new Date(opens);
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (deadlineDate < now) return 'closed';
    if (daysUntil <= 14) return 'closing-soon';
    if (openDate <= now) return 'open';
    return 'opening-soon';
  };

  const calculateDaysUntilDeadline = (deadline: string): number => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    return Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatCurrency = (amount: string, currency: string) => {
    const num = parseFloat(amount);
    if (num >= 1000000) {
      return `${currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}${(num / 1000).toFixed(0)}K`;
    }
    return `${currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'}${num}`;
  };

  const stats = {
    total: grants.length,
    verified: grants.filter(g => g.verified).length,
    open: grants.filter(g => g.status === 'open').length,
    closingSoon: grants.filter(g => g.status === 'closing-soon').length,
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 0.5 }}>
            Grant Management
          </Typography>
          <Typography variant="body1" sx={{ color: '#a0a0a0' }}>
            Manage film funding opportunities and grant programs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={handleOpenSyncSettings}
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212, 175, 55, 0.1)',
              },
            }}
          >
            Auto-Sync Settings
          </Button>
          <Button
            variant="outlined"
            startIcon={<Upload />}
            onClick={() => setBulkImportOpen(true)}
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212, 175, 55, 0.1)',
              },
            }}
          >
            Bulk Import
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddGrantOpen(true)}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
            }}
          >
            Add Grant
          </Button>
        </Box>
      </Box>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 3 }}>{fetchError}</Alert>
      )}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#D4AF37' }} />
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MonetizationOn sx={{ color: '#D4AF37', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700 }}>
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                    Total Grants
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircle sx={{ color: '#4caf50', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                    {stats.verified}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                    Verified
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Schedule sx={{ color: '#4caf50', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#4caf50', fontWeight: 700 }}>
                    {stats.open}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                    Open Now
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Warning sx={{ color: '#ff9800', fontSize: 32 }} />
                <Box>
                  <Typography variant="h4" sx={{ color: '#ff9800', fontWeight: 700 }}>
                    {stats.closingSoon}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                    Closing Soon
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Auto-Sync Status */}
      <Card sx={{ mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Sync sx={{ color: '#D4AF37', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  AI-Powered Auto-Sync Status
                </Typography>
                <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                  Next scheduled check: <strong>{formatDate(syncStatus?.nextScheduledCheck)}</strong>
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={syncing ? <CircularProgress size={16} sx={{ color: '#000000' }} /> : <Refresh />}
              onClick={handleTriggerSync}
              disabled={syncing}
              sx={{
                bgcolor: '#D4AF37',
                color: '#000000',
                fontWeight: 600,
                '&:hover': { bgcolor: '#D4AF37' },
              }}
            >
              {syncing ? 'Syncing...' : 'Run Sync Now'}
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(102, 187, 106, 0.1)',
                  borderRadius: 2,
                  border: '1px solid rgba(102, 187, 106, 0.3)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ color: '#66bb6a', fontSize: 20 }} />
                  <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {syncStatus?.territoriesSyncing ?? '—'}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                  Territories Auto-Syncing
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(255, 167, 38, 0.1)',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 167, 38, 0.3)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Warning sx={{ color: '#ffa726', fontSize: 20 }} />
                  <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {pendingChanges.length}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                  Pending Updates
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'rgba(66, 165, 245, 0.1)',
                  borderRadius: 2,
                  border: '1px solid rgba(66, 165, 245, 0.3)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Schedule sx={{ color: '#42a5f5', fontSize: 20 }} />
                  <Typography variant="h5" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {syncStatus?.daysSinceLastCheck ?? '—'}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                  Days Since Last Check
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {syncSuccessMessage && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {syncSuccessMessage}
            </Alert>
          )}
          {syncErrorMessage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {syncErrorMessage}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Pending Updates Alert */}
      {pendingChanges.length > 0 && (
        <Alert
          severity="warning"
          icon={<Warning />}
          sx={{
            mb: 4,
            bgcolor: 'rgba(255, 167, 38, 0.1)',
            border: '1px solid rgba(255, 167, 38, 0.3)',
            color: '#ffffff',
          }}
          action={(
            <Button
              color="inherit"
              size="small"
              onClick={() => setShowPendingChanges(!showPendingChanges)}
              endIcon={showPendingChanges ? <ExpandLess /> : <ExpandMore />}
            >
              {showPendingChanges ? 'Hide' : 'Review'}
            </Button>
          )}
        >
          <Typography variant="body2">
            <strong>{pendingChanges.length} update(s) detected</strong> by AI auto-sync and awaiting your review
          </Typography>
        </Alert>
      )}

      {/* Pending Changes Section */}
      <Collapse in={showPendingChanges}>
        <Paper sx={{ mb: 4, bgcolor: '#0a0a0a', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
          <Box sx={{ p: 2, bgcolor: 'rgba(255, 152, 0, 0.05)' }}>
            <Typography variant="h6" sx={{ color: '#ffa726', fontWeight: 600 }}>
              Pending Grant Changes for Review
            </Typography>
          </Box>
          {pendingChanges.map((change, index) => (
            <Box
              key={change.id}
              sx={{
                p: 3,
                borderBottom: index < pendingChanges.length - 1 ? '1px solid rgba(255, 152, 0, 0.1)' : 'none',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                    {change.territory} - {change.field}
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 0.5 }}>
                        Current Value:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600 }}>
                        {change.currentValue ?? 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Typography sx={{ color: '#666' }}>→</Typography>
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 0.5 }}>
                        Detected Value:
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#66bb6a', fontWeight: 600 }}>
                        {change.detectedValue}
                      </Typography>
                    </Grid>
                  </Grid>
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Chip
                      label={`${change.confidence.toUpperCase()} CONFIDENCE`}
                      size="small"
                      sx={{
                        bgcolor: change.confidence === 'high' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                        color: change.confidence === 'high' ? '#66bb6a' : '#ffa726',
                        fontWeight: 600,
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                      {change.source}
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CheckCircle />}
                    onClick={() => handleApproveChange(change)}
                    sx={{
                      bgcolor: '#66bb6a',
                      color: '#000000',
                      '&:hover': { bgcolor: '#4caf50' },
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleRejectChange(change)}
                    sx={{
                      borderColor: '#666',
                      color: '#a0a0a0',
                      '&:hover': {
                        borderColor: '#999',
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    Reject
                  </Button>
                </Box>
              </Box>
            </Box>
          ))}
        </Paper>
      </Collapse>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'rgba(212, 175, 55, 0.2)' }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            '& .MuiTab-root': {
              color: '#a0a0a0',
              fontWeight: 600,
              '&.Mui-selected': {
                color: '#D4AF37',
              },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#D4AF37',
              height: 3,
            },
          }}
        >
          <Tab label={`All Grants (${grants.length})`} />
          <Tab label={`Unverified (${grants.filter(g => !g.verified).length})`} />
          <Tab label={`Closing Soon (${stats.closingSoon})`} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <GrantsTable 
          grants={grants}
          onEdit={openEditDialog}
          onPreview={openPreviewDialog}
          onDelete={openDeleteDialog}
          onToggleVerified={toggleVerified}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <GrantsTable 
          grants={grants.filter(g => !g.verified)}
          onEdit={openEditDialog}
          onPreview={openPreviewDialog}
          onDelete={openDeleteDialog}
          onToggleVerified={toggleVerified}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <GrantsTable 
          grants={grants.filter(g => g.status === 'closing-soon')}
          onEdit={openEditDialog}
          onPreview={openPreviewDialog}
          onDelete={openDeleteDialog}
          onToggleVerified={toggleVerified}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      </TabPanel>

      {/* Add/Edit Grant Dialog */}
      <GrantFormDialog
        open={addGrantOpen || editGrantOpen}
        onClose={() => {
          setAddGrantOpen(false);
          setEditGrantOpen(false);
          resetForm();
          setSelectedGrant(null);
        }}
        onSave={editGrantOpen ? handleEditGrant : handleAddGrant}
        formData={formData}
        setFormData={setFormData}
        territories={territories}
        currencies={currencies}
        isEdit={editGrantOpen}
      />

      {/* Preview Dialog */}
      {selectedGrant && (
        <GrantPreviewDialog
          open={previewGrantOpen}
          onClose={() => {
            setPreviewGrantOpen(false);
            setSelectedGrant(null);
          }}
          grant={selectedGrant}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setSelectedGrant(null);
        }}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a1a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff' }}>
          Delete Grant
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#a0a0a0' }}>
            Are you sure you want to delete "{selectedGrant?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteConfirmOpen(false);
            setSelectedGrant(null);
          }} sx={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteGrant}
            sx={{
              bgcolor: '#f44336',
              color: '#ffffff',
              '&:hover': {
                bgcolor: '#d32f2f',
              },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auto-Sync Settings Dialog */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          },
        }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 600 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule />
            Auto-Sync Configuration
          </Box>
        </DialogTitle>
        <DialogContent>
          {syncSettingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#D4AF37' }} />
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(33, 150, 243, 0.1)', color: '#42a5f5' }}>
                <strong>How it works:</strong> Our scraper reads official grants sources, extracts structured changes,
                and queues them for admin moderation before they are applied.
              </Alert>

              {syncSettings && (
                <Box sx={{ mb: 3, p: 2, bgcolor: '#1a1a1a', borderRadius: 2, border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                  <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                    Last sync: <strong style={{ color: '#ffffff' }}>{formatDate(syncSettings.lastSyncAt)}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#a0a0a0', mt: 0.5 }}>
                    Next scheduled: <strong style={{ color: '#ffffff' }}>{formatDate(syncSettings.nextScheduledCheck)}</strong>
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#a0a0a0', mb: 1 }}>
                  Sync Schedule:
                </Typography>
                <TextField
                  select
                  fullWidth
                  value={syncSettingsForm.schedule || syncSettings?.schedule || 'quarterly'}
                  onChange={(e) => setSyncSettingsForm({
                    ...syncSettingsForm,
                    schedule: e.target.value as SyncSettingsUpdate['schedule'],
                  })}
                  SelectProps={{ native: true }}
                >
                  <option value="monthly">Monthly (1st of each month)</option>
                  <option value="quarterly">Quarterly (Jan, Apr, Jul, Oct)</option>
                  <option value="biannual">Semi-Annual (Jan, Jul)</option>
                  <option value="annual">Annual (January)</option>
                </TextField>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={() => setSyncDialogOpen(false)} sx={{ color: '#a0a0a0' }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSyncSettings}
            disabled={syncSettingsLoading}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              '&:hover': { bgcolor: '#D4AF37' },
            }}
          >
            Save Settings
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={bulkImportOpen}
        onClose={() => setBulkImportOpen(false)}
        onImportSuccess={loadGrants}
      />
    </Box>
  );
}

// Grants Table Component
interface GrantsTableProps {
  grants: Grant[];
  onEdit: (grant: Grant) => void;
  onPreview: (grant: Grant) => void;
  onDelete: (grant: Grant) => void;
  onToggleVerified: (grantId: string) => void;
  formatCurrency: (amount: string, currency: string) => string;
  getStatusColor: (status: Grant['status']) => string;
  getStatusIcon: (status: Grant['status']) => JSX.Element;
}

function GrantsTable({
  grants,
  onEdit,
  onPreview,
  onDelete,
  onToggleVerified,
  formatCurrency,
  getStatusColor,
  getStatusIcon,
}: GrantsTableProps) {
  if (grants.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center', bgcolor: '#0a0a0a', border: '1px dashed rgba(212, 175, 55, 0.3)' }}>
        <Typography variant="h6" sx={{ color: '#a0a0a0', mb: 1 }}>
          No grants found
        </Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>
          Add your first grant to get started
        </Typography>
      </Paper>
    );
  }

  return (
    <TableContainer component={Paper} sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
      <Table>
        <TableHead>
          <TableRow sx={{ borderBottom: '2px solid rgba(212, 175, 55, 0.2)' }}>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Grant Title</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Territory</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Max Amount</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Deadline</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Source</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Verified</TableCell>
            <TableCell sx={{ color: '#D4AF37', fontWeight: 700 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {grants.map((grant) => {
            const source = (typeof grant.dataSource === 'string' ? grant.dataSource : 'manual') as Grant['dataSource'];
            const isManual = source === 'manual';
            return (
              <TableRow key={grant.id} sx={{ '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}>
              <TableCell sx={{ color: '#ffffff' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {grant.title}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                    {grant.fundingBody}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  label={grant.territory}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(212, 175, 55, 0.2)',
                    color: '#D4AF37',
                  }}
                />
              </TableCell>
              <TableCell sx={{ color: '#4caf50', fontWeight: 600 }}>
                {formatCurrency(grant.maxAmount, grant.currency)}
              </TableCell>
              <TableCell>
                <Box>
                  <Typography variant="body2" sx={{ color: '#ffffff' }}>
                    {new Date(grant.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Typography>
                  <Typography variant="caption" sx={{ color: grant.daysUntilDeadline <= 14 ? '#ff9800' : '#a0a0a0' }}>
                    {grant.daysUntilDeadline > 0 ? `${grant.daysUntilDeadline} days left` : 'Expired'}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell>
                <Chip
                  icon={getStatusIcon(grant.status)}
                  label={grant.status.replace('-', ' ').toUpperCase()}
                  size="small"
                  sx={{
                    bgcolor: `${getStatusColor(grant.status)}20`,
                    color: getStatusColor(grant.status),
                    border: `1px solid ${getStatusColor(grant.status)}`,
                    fontWeight: 600,
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={source.toUpperCase()}
                  size="small"
                  sx={{
                    bgcolor: isManual ? 'rgba(33, 150, 243, 0.2)' : 'rgba(156, 39, 176, 0.2)',
                    color: isManual ? '#2196F3' : '#9C27B0',
                  }}
                />
              </TableCell>
              <TableCell>
                <Tooltip title={grant.verified ? 'Mark as unverified' : 'Mark as verified'}>
                  <Switch
                    checked={grant.verified}
                    onChange={() => onToggleVerified(grant.id)}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': {
                        color: '#4caf50',
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: '#4caf50',
                      },
                    }}
                  />
                </Tooltip>
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <Tooltip title="Preview">
                    <IconButton size="small" onClick={() => onPreview(grant)} sx={{ color: '#2196F3' }}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => onEdit(grant)} sx={{ color: '#D4AF37' }}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" onClick={() => onDelete(grant)} sx={{ color: '#f44336' }}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// Grant Form Dialog Component
interface GrantFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: any;
  setFormData: (data: any) => void;
  territories: string[];
  currencies: string[];
  isEdit: boolean;
}

function GrantFormDialog({
  open,
  onClose,
  onSave,
  formData,
  setFormData,
  territories,
  currencies,
  isEdit,
}: GrantFormDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        },
      }}
    >
      <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        {isEdit ? 'Edit Grant' : 'Add New Grant'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Grant Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover fieldset': { borderColor: '#D4AF37' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#a0a0a0' }}>Territory</InputLabel>
              <Select
                value={formData.territory}
                label="Territory"
                onChange={(e) => setFormData({ ...formData, territory: e.target.value })}
                sx={{
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
                }}
              >
                {territories.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Funding Body"
              value={formData.fundingBody}
              onChange={(e) => setFormData({ ...formData, fundingBody: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover fieldset': { borderColor: '#D4AF37' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Max Amount"
              type="number"
              value={formData.maxAmount}
              onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover fieldset': { borderColor: '#D4AF37' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel sx={{ color: '#a0a0a0' }}>Currency</InputLabel>
              <Select
                value={formData.currency}
                label="Currency"
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                sx={{
                  color: '#ffffff',
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
                }}
              >
                {currencies.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Application Opens"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.applicationOpens}
              onChange={(e) => setFormData({ ...formData, applicationOpens: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover fieldset': { borderColor: '#D4AF37' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              fullWidth
              label="Application Deadline"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={formData.applicationDeadline}
              onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover fieldset': { borderColor: '#D4AF37' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Website URL"
              value={formData.websiteUrl}
              onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
              sx={{
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover fieldset': { borderColor: '#D4AF37' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Eligibility Criteria (one per line)"
              value={formData.eligibility}
              onChange={(e) => setFormData({ ...formData, eligibility: e.target.value })}
              placeholder="UK-qualified productions&#10;High-end TV drama&#10;Budget >£1M/hour"
              sx={{
                '& .MuiInputLabel-root': { color: '#a0a0a0' },
                '& .MuiOutlinedInput-root': {
                  color: '#ffffff',
                  '& fieldset': { borderColor: 'rgba(212, 175, 55, 0.2)' },
                  '&:hover fieldset': { borderColor: '#D4AF37' },
                  '&.Mui-focused fieldset': { borderColor: '#D4AF37' },
                },
              }}
            />
          </Grid>

          <Grid size={{ xs: 12 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.verified}
                  onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#4caf50' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#4caf50' },
                  }}
                />
              }
              label={<Typography sx={{ color: '#ffffff' }}>Mark as Verified</Typography>}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <Button onClick={onClose} sx={{ color: '#a0a0a0' }}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={!formData.title || !formData.territory || !formData.fundingBody}
          sx={{
            bgcolor: '#D4AF37',
            color: '#000000',
            fontWeight: 600,
            '&:hover': { bgcolor: '#D4AF37' },
            '&:disabled': {
              bgcolor: 'rgba(212, 175, 55, 0.3)',
              color: 'rgba(0, 0, 0, 0.5)',
            },
          }}
        >
          {isEdit ? 'Save Changes' : 'Add Grant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Grant Preview Dialog Component
interface GrantPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  grant: Grant;
  formatCurrency: (amount: string, currency: string) => string;
  getStatusColor: (status: Grant['status']) => string;
}

function GrantPreviewDialog({ open, onClose, grant, formatCurrency }: GrantPreviewDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        },
      }}
    >
      <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        Grant Preview (User View)
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {/* This mimics the user-facing grant card */}
        <Paper
          sx={{
            p: 2.5,
            bgcolor: grant.status === 'closing-soon' ? 'rgba(255, 152, 0, 0.05)' : 'rgba(212, 175, 55, 0.03)',
            border: grant.status === 'closing-soon' ? '2px solid #ff9800' : '1px solid rgba(212, 175, 55, 0.15)',
          }}
        >
          <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
            {grant.title}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label={grant.territory} size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }} />
            <Chip label={grant.fundingBody} size="small" sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)', color: '#2196F3' }} />
            <Chip 
              label={`Max: ${formatCurrency(grant.maxAmount, grant.currency)}`}
              size="small"
              sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50', fontWeight: 600 }}
            />
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 4 }}>
              <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>Opens</Typography>
              <Typography variant="body2" sx={{ color: '#ffffff' }}>
                {new Date(grant.applicationOpens).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>Deadline</Typography>
              <Typography variant="body2" sx={{ color: grant.status === 'closing-soon' ? '#ff9800' : '#ffffff', fontWeight: grant.status === 'closing-soon' ? 700 : 500 }}>
                {new Date(grant.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>Time Left</Typography>
              <Typography variant="body2" sx={{ color: grant.daysUntilDeadline <= 14 ? '#ff9800' : '#4caf50', fontWeight: 600 }}>
                {grant.daysUntilDeadline} days
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mb: 0.5 }}>Eligibility</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {grant.eligibility.slice(0, 3).map((criteria, idx) => (
                <Chip
                  key={idx}
                  label={criteria}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    color: '#a0a0a0',
                    fontSize: '0.7rem',
                  }}
                />
              ))}
            </Box>
          </Box>

          <Button
            variant="outlined"
            fullWidth
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212, 175, 55, 0.1)',
              },
            }}
          >
            Apply Now →
          </Button>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <Button onClick={onClose} sx={{ color: '#D4AF37' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// Bulk Import Dialog Component
function BulkImportDialog({
  open,
  onClose,
  onImportSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleClose = () => {
    setResult(null);
    setUploadError(null);
    onClose();
  };

  const handleDownloadTemplate = () => {
    const headers = 'title,territory,fundingBody,maxAmount,currency,applicationOpens,applicationDeadline,eligibility,websiteUrl,verified';
    const example = 'BFI Film Fund,UK,British Film Institute,500000,GBP,2026-03-01,2026-06-30,UK-qualified productions;High-end drama,https://www.bfi.org.uk,true';
    const csv = `${headers}\n${example}\n`;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grants_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setResult(null);
    setUploadError(null);
    const { data, error } = await adminApi.bulkImportGrants(file);
    setUploading(false);
    if (error) {
      setUploadError(error);
    } else if (data) {
      setResult(data);
      if (data.imported > 0) onImportSuccess();
    }
    // reset the input so the same file can be re-uploaded if needed
    e.target.value = '';
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: '#1a1a1a',
          border: '1px solid rgba(212, 175, 55, 0.2)',
        },
      }}
    >
      <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        Bulk Import Grants
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(33, 150, 243, 0.1)', '& .MuiAlert-icon': { color: '#2196F3' } }}>
          <Typography variant="body2" sx={{ color: '#2196F3' }}>
            Upload a CSV file with grant data. Download the template below for the correct format.
            Eligibility values should be semicolon-separated.
          </Typography>
        </Alert>

        <Button
          variant="outlined"
          startIcon={<Download />}
          fullWidth
          onClick={handleDownloadTemplate}
          sx={{
            mb: 2,
            borderColor: '#D4AF37',
            color: '#D4AF37',
            '&:hover': {
              borderColor: '#D4AF37',
              bgcolor: 'rgba(212, 175, 55, 0.1)',
            },
          }}
        >
          Download CSV Template
        </Button>

        <Button
          variant="contained"
          component="label"
          startIcon={uploading ? <CircularProgress size={16} sx={{ color: '#000' }} /> : <Upload />}
          fullWidth
          disabled={uploading}
          sx={{
            bgcolor: '#D4AF37',
            color: '#000000',
            fontWeight: 600,
            '&:hover': { bgcolor: '#D4AF37' },
            '&:disabled': { bgcolor: 'rgba(212, 175, 55, 0.4)' },
          }}
        >
          {uploading ? 'Uploading...' : 'Upload CSV File'}
          <input type="file" accept=".csv" hidden onChange={handleFileChange} />
        </Button>

        {uploadError && (
          <Alert severity="error" sx={{ mt: 2 }}>{uploadError}</Alert>
        )}

        {result && (
          <Alert
            severity={result.failed > 0 ? 'warning' : 'success'}
            sx={{ mt: 2 }}
          >
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {result.imported} imported, {result.failed} failed
            </Typography>
            {result.errors.map((err, i) => (
              <Typography key={i} variant="caption" display="block" sx={{ mt: 0.5 }}>
                Row {err.row}: {err.reason}
              </Typography>
            ))}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <Button onClick={handleClose} sx={{ color: '#a0a0a0' }}>
          {result ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
