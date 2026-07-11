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
  Alert,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  FormControlLabel,
  CircularProgress,
  Collapse,
  Link,
  Checkbox,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  OpenInNew,
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
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import { getTerritories } from '@/services/api';
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
        adminApi.getGrants(500, 0),
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
    const { data, error } = await adminApi.getGrants(500, 0);
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

  // Form state — HONEST DEFAULTS: a new grant never looks verified.
  // verified=false, no verification date, status unset ('' — excluded from
  // reports until the admin explicitly chooses one).
  const EMPTY_GRANT_FORM = {
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
    lastVerifiedAt: '',
    status: '',
    continent: '',
    grant_type: '',
    recurrence: '',
    eligible_formats: '' as string,   // comma-separated in the form
    genre_tags: '' as string,         // comma-separated in the form
    nationality_required: false,
    co_production_required: false,
    productionStage: '',
    emergingFilmmaker: null as boolean | null,
    budget_min_usd: '' as string,
    budget_max_usd: '' as string,
    amount_usd_approx: '' as string,
  };
  const [formData, setFormData] = useState<any>({ ...EMPTY_GRANT_FORM });
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [formWarnings, setFormWarnings] = useState<string[]>([]);
  const [dupeWarned, setDupeWarned] = useState(false);

  const [territories, setTerritories] = useState<string[]>([]);
  useEffect(() => {
    getTerritories()
      .then((ts) => setTerritories(['Global', ...ts.map((t: any) => t.label)]))
      .catch(() => setTerritories([]));
  }, []);
  const currencies = ['GBP', 'USD', 'CAD', 'EUR', 'ZAR', 'AUD', 'HUF', 'CZK', 'NGN', 'INR', 'JPY', 'KRW'];

  // Filters + search
  const [search, setSearch] = useState('');
  const [filterContinent, setFilterContinent] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterFormat, setFilterFormat] = useState('all');
  const [filterGenre, setFilterGenre] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVerified, setFilterVerified] = useState('all');
  const [filterEmerging, setFilterEmerging] = useState('all');

  const normStatus = (status?: string) => (status || '').replace(/-/g, '_');
  const getStatusColor = (status?: string) => {
    switch (normStatus(status)) {
      case 'opening_soon': return '#2196F3';
      case 'open': return '#4caf50';
      case 'closing_soon': return '#ff9800';
      case 'closed': return '#666666';
      default: return '#666666';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (normStatus(status)) {
      case 'opening_soon': return <Schedule />;
      case 'open': return <CheckCircle />;
      case 'closing_soon': return <Warning />;
      case 'closed': return <Event />;
      default: return <Event />;
    }
  };

  // Shared validation for add/edit. Errors block; warnings inform.
  const validateGrantForm = (isEdit: boolean): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!formData.title?.trim()) errors.push('Grant title is required.');
    if (!formData.websiteUrl?.trim()) errors.push('Website / source URL is required — no grant without a source.');
    if (!formData.territory) errors.push('Territory is required.');
    else if (territories.length > 0 && !territories.includes(formData.territory)) {
      errors.push('Territory must be a canonical territory (or Global).');
    }
    for (const [label, v] of [['Budget min (USD)', formData.budget_min_usd], ['Budget max (USD)', formData.budget_max_usd], ['Approx amount (USD)', formData.amount_usd_approx]] as const) {
      if (v !== '' && v != null && Number.isNaN(Number(v))) errors.push(`${label} must be a number.`);
    }
    for (const [label, v] of [['Opens', formData.applicationOpens], ['Deadline', formData.applicationDeadline]] as const) {
      if (v && v.toLowerCase() !== 'rolling' && !/^tbc/i.test(v) && Number.isNaN(Date.parse(v))) {
        errors.push(`${label} must be a date (YYYY-MM-DD), "rolling", or "tbc…".`);
      }
    }
    if (formData.verified && !formData.lastVerifiedAt) {
      errors.push('Verified requires an explicit verification date — it is never auto-filled.');
    }
    if (!formData.status) warnings.push('Status is unset — this grant is excluded from reports until a status is chosen.');
    if (!formData.eligible_formats?.trim()) warnings.push('No eligible formats — the grants matcher cannot format-gate this fund.');
    if (!formData.genre_tags?.trim()) warnings.push('No genre tags set.');
    if (!isEdit) {
      const dupe = grants.find(
        (g) => g.title.trim().toLowerCase() === formData.title.trim().toLowerCase()
          && (g.fundingBody || '').trim().toLowerCase() === (formData.fundingBody || '').trim().toLowerCase(),
      );
      if (dupe) warnings.push(`Possible duplicate: "${dupe.title}" by ${dupe.fundingBody || 'unknown'} already exists.`);
    }
    return { errors, warnings };
  };

  const csv = (s: string): string[] => s.split(',').map((x) => x.trim()).filter(Boolean);
  const numOrNull = (v: any): number | null => (v === '' || v == null ? null : Number(v));

  const buildGrantPayload = (): Partial<Grant> => ({
    title: formData.title,
    territory: formData.territory,
    fundingBody: formData.fundingBody,
    maxAmount: formData.maxAmount,
    currency: formData.currency,
    applicationOpens: formData.applicationOpens,
    applicationDeadline: formData.applicationDeadline,
    // status is the admin's explicit choice — never auto-recomputed
    status: formData.status || null as any,
    eligibility: (formData.eligibility || '').split('\n').filter((e: string) => e.trim()),
    websiteUrl: formData.websiteUrl,
    verified: formData.verified,
    // never auto-filled: only what the admin explicitly entered
    lastVerifiedAt: formData.verified && formData.lastVerifiedAt ? formData.lastVerifiedAt : null,
    continent: formData.continent || null,
    grant_type: formData.grant_type || null,
    recurrence: formData.recurrence || null,
    eligible_formats: formData.eligible_formats ? csv(formData.eligible_formats) : null,
    genre_tags: formData.genre_tags ? csv(formData.genre_tags) : null,
    nationality_required: !!formData.nationality_required,
    co_production_required: !!formData.co_production_required,
    productionStage: formData.productionStage || null,
    emergingFilmmaker: formData.emergingFilmmaker,
    budget_min_usd: numOrNull(formData.budget_min_usd),
    budget_max_usd: numOrNull(formData.budget_max_usd),
    amount_usd_approx: numOrNull(formData.amount_usd_approx),
  });

  const handleAddGrant = async () => {
    const { errors, warnings } = validateGrantForm(false);
    setFormErrors(errors);
    setFormWarnings(warnings);
    if (errors.length > 0) return;
    if (warnings.length > 0 && !dupeWarned) { setDupeWarned(true); return; } // first click warns, second proceeds
    const payload = { ...buildGrantPayload(), dataSource: 'manual', isNew: true } as CreateGrantPayload;
    const { data, error } = await adminApi.createGrant(payload);
    if (!error && data) {
      setGrants([...grants, data]);
    }
    setAddGrantOpen(false);
    setDupeWarned(false);
    resetForm();
  };

  const handleEditGrant = async () => {
    if (!selectedGrant) return;
    const { errors, warnings } = validateGrantForm(true);
    setFormErrors(errors);
    setFormWarnings(warnings);
    if (errors.length > 0) return;
    const payload = buildGrantPayload();
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
      ...EMPTY_GRANT_FORM,
      title: grant.title,
      territory: grant.territory,
      fundingBody: grant.fundingBody,
      maxAmount: grant.maxAmount,
      currency: grant.currency,
      applicationOpens: grant.applicationOpens,
      applicationDeadline: grant.applicationDeadline,
      eligibility: (grant.eligibility || []).join('\n'),
      websiteUrl: grant.websiteUrl,
      verified: grant.verified,
      lastVerifiedAt: grant.lastVerifiedAt ? String(grant.lastVerifiedAt).slice(0, 10) : '',
      status: normStatus(grant.status) || '',
      continent: grant.continent || '',
      grant_type: grant.grant_type || '',
      recurrence: grant.recurrence || '',
      eligible_formats: (grant.eligible_formats || []).join(', '),
      genre_tags: (grant.genre_tags || []).join(', '),
      nationality_required: !!grant.nationality_required,
      co_production_required: !!grant.co_production_required,
      productionStage: grant.productionStage || '',
      emergingFilmmaker: grant.emergingFilmmaker ?? null,
      budget_min_usd: grant.budget_min_usd ?? '',
      budget_max_usd: grant.budget_max_usd ?? '',
      amount_usd_approx: grant.amount_usd_approx ?? '',
    });
    setFormErrors([]);
    setFormWarnings([]);
    setDupeWarned(false);
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

    setSyncSuccessMessage('Grant auto sync started. New scraped diffs will appear after processing.');
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
    setFormData({ ...EMPTY_GRANT_FORM });
    setFormErrors([]);
    setFormWarnings([]);
    setDupeWarned(false);
  };

  const formatCurrency = (amount: string, currency: string) => {
    // v2 amounts are display strings ("Up to £250,000") — show them verbatim.
    const num = parseFloat(amount);
    if (Number.isNaN(num) || String(num) !== String(amount).trim()) {
      return amount;
    }
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
    open: grants.filter(g => normStatus(g.status) === 'open').length,
    openingSoon: grants.filter(g => normStatus(g.status) === 'opening_soon').length,
    closingSoon: grants.filter(g => normStatus(g.status) === 'closing_soon').length,
    closed: grants.filter(g => normStatus(g.status) === 'closed').length,
    rolling: grants.filter(g => (g.applicationDeadline || '').toLowerCase() === 'rolling').length,
    emerging: grants.filter(g => g.emergingFilmmaker === true).length,
  };

  // Client-side filters + search (applied before the tabs' own slicing)
  const filteredGrants = grants.filter((g) => {
    const q = search.trim().toLowerCase();
    if (q && !`${g.title} ${g.fundingBody || ''}`.toLowerCase().includes(q)) return false;
    if (filterContinent !== 'all' && g.continent !== filterContinent) return false;
    if (filterType !== 'all' && g.grant_type !== filterType) return false;
    if (filterFormat !== 'all' && !(g.eligible_formats || []).includes(filterFormat)) return false;
    if (filterGenre !== 'all' && !(g.genre_tags || []).includes(filterGenre)) return false;
    if (filterStatus !== 'all' && normStatus(g.status) !== filterStatus) return false;
    if (filterVerified !== 'all' && String(g.verified) !== filterVerified) return false;
    if (filterEmerging !== 'all' && String(g.emergingFilmmaker === true) !== filterEmerging) return false;
    return true;
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 0.5 }}>
            Grant Management
          </Typography>
          <Typography variant="body1" sx={{ color: '#a0a0a0' }}>
            Manage film funding opportunities and grant programs
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
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
            Auto Sync Settings
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
            onClick={() => { resetForm(); setAddGrantOpen(true); }}
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

      {/* AI Auto-Sync Status */}
      <Card sx={{ mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Sync sx={{ color: '#D4AF37', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  AI Powered Auto Sync Status
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
                    {syncStatus?.territoriesSyncing ?? 'N/A'}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                  Territories Auto Syncing
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
                    {syncStatus?.daysSinceLastCheck ?? 'N/A'}
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
            <strong>{pendingChanges.length} update(s) detected</strong> by AI auto sync and awaiting your review
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
                    {change.territory}: {change.field}
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
      {/* v2 stat header */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {[
          ['Total', stats.total, '#D4AF37'],
          ['Verified', stats.verified, '#66bb6a'],
          ['Open Now', stats.open, '#4caf50'],
          ['Opening Soon', stats.openingSoon, '#2196F3'],
          ['Closing Soon', stats.closingSoon, '#ff9800'],
          ['Rolling', stats.rolling, '#a0a0a0'],
          ['Emerging-Friendly', stats.emerging, '#ce93d8'],
        ].map(([label, value, colour]) => (
          <Grid size={{ xs: 6, sm: 4, md: 'grow' }} key={String(label)}>
            <Paper sx={{ p: 1.2, textAlign: 'center', bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.15)' }}>
              <Typography variant="h6" sx={{ color: String(colour), fontWeight: 800 }}>{String(value)}</Typography>
              <Typography variant="caption" sx={{ color: '#777', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: '0.62rem' }}>{String(label)}</Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Search + filters */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Search title or funding body…" value={search}
          onChange={(e) => setSearch(e.target.value)} sx={{ flex: '2 1 220px', minWidth: 180 }} />
        <TextField select size="small" label="Continent" value={filterContinent} onChange={(e) => setFilterContinent(e.target.value)} sx={{ flex: '1 1 120px', minWidth: 110 }}>
          <MenuItem value="all">All</MenuItem>
          {[...new Set(grants.map(g => g.continent).filter(Boolean))].sort().map(c => <MenuItem key={String(c)} value={String(c)}>{String(c)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Type" value={filterType} onChange={(e) => setFilterType(e.target.value)} sx={{ flex: '1 1 130px', minWidth: 120 }}>
          <MenuItem value="all">All</MenuItem>
          {[...new Set(grants.map(g => g.grant_type).filter(Boolean))].sort().map(c => <MenuItem key={String(c)} value={String(c)}>{String(c)}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Format" value={filterFormat} onChange={(e) => setFilterFormat(e.target.value)} sx={{ flex: '1 1 120px', minWidth: 110 }}>
          <MenuItem value="all">All</MenuItem>
          {[...new Set(grants.flatMap(g => g.eligible_formats || []))].sort().map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Genre" value={filterGenre} onChange={(e) => setFilterGenre(e.target.value)} sx={{ flex: '1 1 120px', minWidth: 110 }}>
          <MenuItem value="all">All</MenuItem>
          {[...new Set(grants.flatMap(g => g.genre_tags || []))].sort().map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Status" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} sx={{ flex: '1 1 130px', minWidth: 120 }}>
          <MenuItem value="all">All</MenuItem>
          {['open', 'opening_soon', 'closing_soon', 'closed'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Verified" value={filterVerified} onChange={(e) => setFilterVerified(e.target.value)} sx={{ flex: '1 1 110px', minWidth: 100 }}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="true">Verified</MenuItem>
          <MenuItem value="false">Unverified</MenuItem>
        </TextField>
        <TextField select size="small" label="Emerging" value={filterEmerging} onChange={(e) => setFilterEmerging(e.target.value)} sx={{ flex: '1 1 110px', minWidth: 100 }}>
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="true">Emerging-friendly</MenuItem>
          <MenuItem value="false">Not flagged</MenuItem>
        </TextField>
      </Box>

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
          <Tab label={`All Grants (${filteredGrants.length})`} />
          <Tab label={`Unverified (${filteredGrants.filter(g => !g.verified).length})`} />
          <Tab label={`Closing Soon (${stats.closingSoon})`} />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={currentTab} index={0}>
        <GrantsTable 
          grants={filteredGrants}
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
          grants={filteredGrants.filter(g => !g.verified)}
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
          grants={filteredGrants.filter(g => normStatus(g.status) === 'closing_soon')}
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
        errors={formErrors}
        warnings={formWarnings}
        dupeWarned={dupeWarned}
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
            Auto Sync Configuration
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
                  <option value="biannual">Semi Annual (Jan, Jul)</option>
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
  onEdit: (g: Grant) => void;
  onPreview: (g: Grant) => void;
  onDelete: (g: Grant) => void;
  onToggleVerified: (id: string) => void;
  formatCurrency: (amount: string, currency: string) => string;
  getStatusColor: (s?: string) => string;
  getStatusIcon: (s?: string) => React.ReactElement;
}

// Staleness flags — derived for DISPLAY only, from stored dates. The stored
// status/verification themselves are never recomputed or overwritten.
function stalenessFlags(g: Grant): { label: string; colour: string }[] {
  const flags: { label: string; colour: string }[] = [];
  const dl = g.applicationDeadline || '';
  if (dl && dl.toLowerCase() !== 'rolling' && !/^tbc/i.test(dl)) {
    const d = Date.parse(dl);
    if (!Number.isNaN(d) && d < Date.now()) flags.push({ label: 'DEADLINE PASSED', colour: '#f44336' });
  }
  if (g.lastVerifiedAt) {
    const ageDays = (Date.now() - Date.parse(g.lastVerifiedAt)) / 86400000;
    if (ageDays > 183) flags.push({ label: 'STALE — RE-VERIFY (>6mo)', colour: '#f44336' });
    else if (ageDays > 122) flags.push({ label: 'RE-VERIFY (>4mo)', colour: '#ff9800' });
  } else {
    flags.push({ label: 'NEVER VERIFIED', colour: '#f44336' });
  }
  return flags;
}

const grantHeadCell = {
  color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase',
  fontSize: '0.7rem', letterSpacing: 1, whiteSpace: 'nowrap',
} as const;

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
        <Typography variant="h6" sx={{ color: '#a0a0a0', mb: 1 }}>No grants found</Typography>
        <Typography variant="body2" sx={{ color: '#666666' }}>Adjust the filters or add a grant</Typography>
      </Paper>
    );
  }

  const fmtDate = (s?: string | null) => {
    if (!s) return null;
    if (s.toLowerCase?.() === 'rolling') return 'Rolling';
    if (/^tbc/i.test(s)) return s.toUpperCase();
    const d = Date.parse(s);
    return Number.isNaN(d) ? s : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', maxWidth: '100%' }}>
      <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
        <Table size="small" sx={{ minWidth: 1150 }}>
          <TableHead>
            <TableRow sx={{ borderBottom: '2px solid rgba(212, 175, 55, 0.2)' }}>
              <TableCell sx={{ ...grantHeadCell, position: 'sticky', left: 0, zIndex: 3, bgcolor: '#0a0a0a' }}>Grant</TableCell>
              <TableCell sx={grantHeadCell}>Territory</TableCell>
              <TableCell sx={grantHeadCell}>Type · Recurrence</TableCell>
              <TableCell sx={grantHeadCell}>Formats / Genres</TableCell>
              <TableCell sx={grantHeadCell}>Amount</TableCell>
              <TableCell sx={grantHeadCell}>Deadline</TableCell>
              <TableCell sx={grantHeadCell}>Status · Verification</TableCell>
              <TableCell sx={grantHeadCell}>Source</TableCell>
              <TableCell sx={grantHeadCell}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {grants.map((grant) => {
              const flags = stalenessFlags(grant);
              const formats = grant.eligible_formats || [];
              const genres = grant.genre_tags || [];
              const genresShown = genres.length > 4 ? genres.slice(0, 4) : genres;
              return (
                <TableRow key={grant.id} sx={{ '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}>
                  <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: '#0a0a0a', minWidth: 200, maxWidth: 260 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>{grant.title}</Typography>
                    <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block' }}>{grant.fundingBody}</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.4, flexWrap: 'wrap' }}>
                      {grant.emergingFilmmaker === true && (
                        <Chip size="small" label="Emerging" sx={{ bgcolor: 'rgba(206,147,216,0.15)', color: '#ce93d8', fontSize: '0.62rem', height: 18 }} />
                      )}
                      {grant.productionStage && (
                        <Chip size="small" label={grant.productionStage} sx={{ bgcolor: '#161616', color: '#a0a0a0', fontSize: '0.62rem', height: 18 }} />
                      )}
                      {grant.nationality_required && (
                        <Chip size="small" label="NATIONALITY" sx={{ bgcolor: 'rgba(255,152,0,0.15)', color: '#ff9800', fontSize: '0.6rem', height: 18, fontWeight: 700 }} />
                      )}
                      {grant.co_production_required && (
                        <Chip size="small" label="CO-PRO REQ" sx={{ bgcolor: 'rgba(79,131,204,0.15)', color: '#4f83cc', fontSize: '0.6rem', height: 18, fontWeight: 700 }} />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={grant.territory} size="small" sx={{ bgcolor: 'rgba(212, 175, 55, 0.2)', color: '#D4AF37' }} />
                    {grant.continent && (
                      <Typography variant="caption" sx={{ color: '#777', display: 'block', mt: 0.3 }}>{grant.continent}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: '#ccc', display: 'block' }}>{grant.grant_type || '—'}</Typography>
                    <Typography variant="caption" sx={{ color: '#777' }}>{grant.recurrence || ''}</Typography>
                  </TableCell>
                  <TableCell sx={{ maxWidth: 190 }}>
                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap' }}>
                      {formats.map((f) => (
                        <Chip key={f} size="small" label={f} sx={{ bgcolor: 'rgba(102,187,106,0.12)', color: '#66bb6a', fontSize: '0.62rem', height: 18 }} />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mt: 0.4 }}>
                      {genresShown.map((g2) => (
                        <Chip key={g2} size="small" label={g2} sx={{ bgcolor: '#161616', color: '#888', fontSize: '0.6rem', height: 16 }} />
                      ))}
                      {genres.length > genresShown.length && (
                        <Typography variant="caption" sx={{ color: '#666' }}>+{genres.length - genresShown.length}</Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 600 }}>
                      {grant.maxAmount ? formatCurrency(grant.maxAmount, grant.currency) : '—'}
                    </Typography>
                    {grant.amount_usd_approx != null && (
                      <Typography variant="caption" sx={{ color: '#777', display: 'block' }}>≈ ${grant.amount_usd_approx.toLocaleString()} USD</Typography>
                    )}
                    {(grant.budget_min_usd != null || grant.budget_max_usd != null) && (
                      <Typography variant="caption" sx={{ color: '#777', display: 'block' }}>
                        budget {grant.budget_min_usd != null ? `$${grant.budget_min_usd.toLocaleString()}` : 'any'} – {grant.budget_max_usd != null ? `$${grant.budget_max_usd.toLocaleString()}` : 'any'}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 120 }}>
                    <Typography variant="body2" sx={{ color: '#fff' }}>{fmtDate(grant.applicationDeadline) || '—'}</Typography>
                    {grant.applicationOpens && (
                      <Typography variant="caption" sx={{ color: '#777', display: 'block' }}>opens {fmtDate(grant.applicationOpens)}</Typography>
                    )}
                    {grant.daysUntilDeadline != null && grant.daysUntilDeadline > 0 && (
                      <Typography variant="caption" sx={{ color: grant.daysUntilDeadline <= 14 ? '#ff9800' : '#a0a0a0' }}>
                        {grant.daysUntilDeadline ?? '—'} days left (at last verification)
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ minWidth: 165 }}>
                    {grant.status ? (
                      <Chip
                        icon={getStatusIcon(grant.status)}
                        label={String(grant.status).replace(/[-_]/g, ' ').toUpperCase()}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(grant.status)}20`,
                          color: getStatusColor(grant.status),
                          border: `1px solid ${getStatusColor(grant.status)}`,
                          fontWeight: 600,
                        }}
                      />
                    ) : (
                      <Chip size="small" label="STATUS UNSET" sx={{ bgcolor: '#161616', color: '#777' }} />
                    )}
                    <Typography variant="caption" sx={{ color: '#777', display: 'block', mt: 0.4 }}>
                      {grant.lastVerifiedAt ? `verified ${fmtDate(grant.lastVerifiedAt)}` : 'no verification date'}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.4, flexWrap: 'wrap', mt: 0.3 }}>
                      {flags.map((f) => (
                        <Chip key={f.label} size="small" label={f.label}
                          sx={{ bgcolor: `${f.colour}18`, color: f.colour, fontSize: '0.58rem', height: 16, fontWeight: 700 }} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {grant.websiteUrl ? (
                      <Link href={grant.websiteUrl} target="_blank" rel="noopener"
                        sx={{ color: '#D4AF37', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 0.4 }}>
                        Source <OpenInNew sx={{ fontSize: 13 }} />
                      </Link>
                    ) : (
                      <Typography variant="caption" sx={{ color: '#f44336', fontWeight: 700 }}>NO SOURCE</Typography>
                    )}
                    <Typography variant="caption" sx={{ color: '#666', display: 'block' }}>{grant.dataSource}</Typography>
                  </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton size="small" onClick={() => onPreview(grant)}>
                      <Visibility sx={{ color: '#a0a0a0', fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => onEdit(grant)}>
                      <Edit sx={{ color: '#D4AF37', fontSize: 18 }} />
                    </IconButton>
                    <IconButton size="small" onClick={() => onToggleVerified(grant.id)}>
                      {grant.verified
                        ? <CheckCircle sx={{ color: '#66bb6a', fontSize: 18 }} />
                        : <CheckCircle sx={{ color: '#444', fontSize: 18 }} />}
                    </IconButton>
                    <IconButton size="small" onClick={() => onDelete(grant)}>
                      <Delete sx={{ color: '#f44336', fontSize: 18 }} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
}

interface GrantFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  formData: any;
  setFormData: (d: any) => void;
  territories: string[];
  currencies: string[];
  isEdit: boolean;
  errors?: string[];
  warnings?: string[];
  dupeWarned?: boolean;
}

const formSection = { color: '#D4AF37', fontWeight: 700, mt: 2.5, mb: 1, fontSize: '0.8rem', letterSpacing: 1, textTransform: 'uppercase' } as const;

function GrantFormDialog({
  open,
  onClose,
  onSave,
  formData,
  setFormData,
  territories,
  currencies,
  isEdit,
  errors = [],
  warnings = [],
  dupeWarned = false,
}: GrantFormDialogProps) {
  const set = (k: string) => (e: any) => setFormData({ ...formData, [k]: e.target.value });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: '#1a1a1a', border: '1px solid rgba(212, 175, 55, 0.2)' } }}
    >
      <DialogTitle sx={{ color: '#ffffff', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
        {isEdit ? 'Edit Grant' : 'Add New Grant'}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {errors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </Alert>
        )}
        {warnings.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {warnings.map((w, i) => <div key={i}>{w}</div>)}
            {!isEdit && dupeWarned && <div style={{ marginTop: 6, fontWeight: 700 }}>Click Save again to proceed anyway.</div>}
          </Alert>
        )}

        <Typography sx={formSection}>Identity</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Grant Title *" value={formData.title} onChange={set('title')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth size="small" label="Territory *" value={formData.territory} onChange={set('territory')}>
              {territories.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Funding Body" value={formData.fundingBody} onChange={set('fundingBody')} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField fullWidth size="small" label="Continent" value={formData.continent} onChange={set('continent')} />
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField select fullWidth size="small" label="Grant type" value={formData.grant_type} onChange={set('grant_type')}>
              <MenuItem value="">—</MenuItem>
              {['public_fund', 'broadcaster', 'foundation', 'co_production'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField select fullWidth size="small" label="Recurrence" value={formData.recurrence} onChange={set('recurrence')}>
              <MenuItem value="">—</MenuItem>
              <MenuItem value="annual">annual</MenuItem>
              <MenuItem value="rolling">rolling</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField select fullWidth size="small" label="Production stage" value={formData.productionStage} onChange={set('productionStage')}>
              <MenuItem value="">— (not stated)</MenuItem>
              {['development', 'production', 'short', 'multi'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>

        <Typography sx={formSection}>Eligibility &amp; matching</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Eligible formats (comma-separated)"
              helperText="feature, short, documentary, tv_series, animation — matcher format gate"
              value={formData.eligible_formats} onChange={set('eligible_formats')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Genre tags (comma-separated)"
              helperText="or 'all' for genre-agnostic funds"
              value={formData.genre_tags} onChange={set('genre_tags')} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" multiline minRows={3} label="Eligibility criteria (one per line)"
              value={formData.eligibility} onChange={set('eligibility')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Checkbox checked={!!formData.nationality_required}
              onChange={(e: any) => setFormData({ ...formData, nationality_required: e.target.checked })} sx={{ color: '#ff9800' }} />}
              label="Nationality / residency restriction" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Checkbox checked={!!formData.co_production_required}
              onChange={(e: any) => setFormData({ ...formData, co_production_required: e.target.checked })} sx={{ color: '#4f83cc' }} />}
              label="Co-production required" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Checkbox checked={formData.emergingFilmmaker === true}
              indeterminate={formData.emergingFilmmaker == null}
              onChange={(e: any) => setFormData({ ...formData, emergingFilmmaker: e.target.checked })} sx={{ color: '#ce93d8' }} />}
              label="Emerging-filmmaker focus (indeterminate = not stated)" />
          </Grid>
        </Grid>

        <Typography sx={formSection}>Amounts &amp; window</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 8, sm: 4 }}>
            <TextField fullWidth size="small" label="Max amount (display string)" value={formData.maxAmount} onChange={set('maxAmount')} />
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <TextField select fullWidth size="small" label="Currency" value={formData.currency} onChange={set('currency')}>
              {currencies.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <TextField fullWidth size="small" label="≈ USD" value={formData.amount_usd_approx} onChange={set('amount_usd_approx')} />
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <TextField fullWidth size="small" label="Budget min USD" value={formData.budget_min_usd} onChange={set('budget_min_usd')} />
          </Grid>
          <Grid size={{ xs: 4, sm: 2 }}>
            <TextField fullWidth size="small" label="Budget max USD" value={formData.budget_max_usd} onChange={set('budget_max_usd')} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label="Opens (YYYY-MM-DD or rolling)" value={formData.applicationOpens} onChange={set('applicationOpens')} />
          </Grid>
          <Grid size={{ xs: 6 }}>
            <TextField fullWidth size="small" label="Deadline (YYYY-MM-DD, rolling or tbc…)" value={formData.applicationDeadline} onChange={set('applicationDeadline')} />
          </Grid>
        </Grid>

        <Typography sx={formSection}>Governance — honest defaults, nothing auto-filled</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Website / source URL * (required — no grant without a source)"
              value={formData.websiteUrl} onChange={set('websiteUrl')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size="small" label="Status (explicit — never auto-computed)"
              helperText="Unset = excluded from reports"
              value={formData.status} onChange={set('status')}>
              <MenuItem value="">Not set</MenuItem>
              {['open', 'opening_soon', 'closing_soon', 'closed'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Checkbox checked={!!formData.verified}
              onChange={(e: any) => setFormData({ ...formData, verified: e.target.checked })} sx={{ color: '#66bb6a' }} />}
              label="Verified (requires date →)" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" type="date" label="Verification date (explicit)"
              InputLabelProps={{ shrink: true }}
              value={formData.lastVerifiedAt} onChange={set('lastVerifiedAt')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212,175,55,0.2)', position: 'sticky', bottom: 0, bgcolor: '#1a1a1a' }}>
        <Button onClick={onClose} sx={{ color: '#a0a0a0' }}>Cancel</Button>
        <Button variant="contained" onClick={onSave}
          sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#B8941F' } }}>
          {isEdit ? 'Save Changes' : (dupeWarned ? 'Save Anyway' : 'Add Grant')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

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
              <Typography variant="body2" sx={{ color: (grant.daysUntilDeadline ?? 99) <= 14 ? '#ff9800' : '#4caf50', fontWeight: 600 }}>
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
    const example = 'BFI Film Fund,UK,British Film Institute,500000,GBP,2026-03-01,2026-06-30,UK qualifying productions;High end drama,https://www.bfi.org.uk,true';
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
            Eligibility values should be semicolon separated.
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
