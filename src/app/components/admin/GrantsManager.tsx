import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Tooltip,
  Alert,
  Grid,
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
  OpenInNew,
  CheckCircle,
  Sync,
  Schedule,
  Upload,
  Download,
  Refresh,
  ExpandMore,
  ExpandLess,
  VolunteerActivismOutlined,
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
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { AdminAccessDenied } from './AdminAccessDenied';

/** Shared section surface, so the summary, sync line and table read as one page. */
const PANEL_SX = { border: 1, borderColor: 'divider', bgcolor: 'background.paper', p: { xs: 2.5, md: 3 } } as const;
const EYEBROW_SX = { fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: 'text.secondary' } as const;

/** Which slice of the grants an admin is working through. */
type Scope = 'all' | 'unverified' | 'closing';

// Normalise a raw grant from the API, handles CSV-imported rows where the
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
  const { mode } = useThemeMode();
  const t = tokens(mode);
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
  // Scope, not filtering. Per-column filtering and sorting belong to the table.
  const [scope, setScope] = useState<Scope>('all');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);

  // Form state, HONEST DEFAULTS: a new grant never looks verified.
  // verified=false, no verification date, status unset ('', excluded from
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


  const normStatus = (status?: string) => (status || '').replace(/-/g, '_');
  const getStatusColor = (status?: string) => {
    switch (normStatus(status)) {
      case 'opening_soon': return 'info.main';
      case 'open': return 'success.main';
      case 'closing_soon': return 'warning.main';
      case 'closed': return 'text.secondary';
      default: return 'text.secondary';
    }
  };

  // Shared validation for add/edit. Errors block; warnings inform.
  const validateGrantForm = (isEdit: boolean): { errors: string[]; warnings: string[] } => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!formData.title?.trim()) errors.push('Grant title is required.');
    if (!formData.websiteUrl?.trim()) errors.push('Website / source URL is required, no grant without a source.');
    if (!formData.territory) errors.push('Territory is required.');
    else if (territories.length > 0 && !territories.includes(formData.territory)) {
      errors.push('Territory must be a canonical territory (or Global).');
    }
    for (const [label, v] of [['Budget min (USD)', formData.budget_min_usd], ['Budget max (USD)', formData.budget_max_usd], ['Approx amount (USD)', formData.amount_usd_approx]] as const) {
      if (v !== '' && v != null && Number.isNaN(Number(v))) errors.push(`${label} must be a number.`);
    }
    for (const [label, v] of [['Opens', formData.applicationOpens], ['Deadline', formData.applicationDeadline]] as const) {
      if (v && v.toLowerCase() !== 'rolling' && !/^tbc/i.test(v) && Number.isNaN(Date.parse(v))) {
        errors.push(`${label} must be a date (YYYY-MM-DD), "rolling", or "tbc...".`);
      }
    }
    if (formData.verified && !formData.lastVerifiedAt) {
      errors.push('Verified requires an explicit verification date, it is never auto-filled.');
    }
    if (!formData.status) warnings.push('Status is unset, this grant is excluded from reports until a status is chosen.');
    if (!formData.eligible_formats?.trim()) warnings.push('No eligible formats, the grants matcher cannot format-gate this fund.');
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
    // status is the admin's explicit choice, never auto-recomputed
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
    if (!dateStr) return 'unknown';
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
    // v2 amounts are display strings ("Up to £250,000"), show them verbatim.
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

  const filteredGrants = grants;

  const scopedGrants = scope === 'unverified'
    ? filteredGrants.filter((g) => !g.verified)
    : scope === 'closing'
      ? filteredGrants.filter((g) => normStatus(g.status) === 'closing_soon')
      : filteredGrants;

  useHeaderActions(
    <>
      <Button size="small" startIcon={<Refresh />} onClick={() => void handleTriggerSync()} disabled={syncing}>
        {syncing ? 'Syncing' : 'Run sync now'}
      </Button>
      <Button size="small" startIcon={<Sync />} onClick={() => void handleOpenSyncSettings()}>
        Sync settings
      </Button>
      <Button size="small" startIcon={<Upload />} onClick={() => setBulkImportOpen(true)}>
        Bulk import
      </Button>
      <Button size="small" variant="contained" startIcon={<Add />} onClick={() => { resetForm(); setAddGrantOpen(true); }}>
        Add grant
      </Button>
    </>,
    [syncing],
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  return (
    <Box>
      {fetchError && <Alert severity="error" sx={{ mb: 3 }}>{fetchError}</Alert>}
      {syncSuccessMessage && <Alert severity="success" sx={{ mb: 3 }}>{syncSuccessMessage}</Alert>}
      {syncErrorMessage && <Alert severity="error" sx={{ mb: 3 }}>{syncErrorMessage}</Alert>}

      {/* Verification leads. An unverified grant with a passed deadline is the
          thing that sends a producer to a closed application. */}
      <Box sx={{ ...PANEL_SX, mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(230px, 1fr) 2fr' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
        <Box>
          <Typography sx={EYEBROW_SX}>VERIFIED GRANTS</Typography>
          <Typography sx={{ fontSize: { xs: 34, md: 42 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {stats.verified}
            <Typography component="span" sx={{ fontSize: 17, fontWeight: 600, color: t.textSecondary }}>
              {' '}of {stats.total}
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 13, color: stats.total - stats.verified > 0 ? t.warning : t.textSecondary, mt: 0.5, fontWeight: stats.total - stats.verified > 0 ? 600 : 400 }}>
            {stats.total - stats.verified > 0
              ? `${stats.total - stats.verified} unverified, so their deadlines and amounts are unconfirmed`
              : 'Every grant has been verified against its official page'}
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {([
            ['Open now', stats.open, 'Accepting applications'],
            ['Closing soon', stats.closingSoon, 'Deadline within reach'],
            ['Opening soon', stats.openingSoon, 'Not yet accepting'],
            ['Rolling', stats.rolling, 'No fixed deadline'],
            ['Emerging friendly', stats.emerging, 'First-time filmmakers'],
            ['Pending changes', pendingChanges.length, pendingChanges.length ? 'Awaiting review' : 'Nothing to review'],
          ] as [string, number, string][]).map(([label, value, hint]) => (
            <Box key={label}>
              <Typography sx={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, lineHeight: 1.2, fontVariantNumeric: 'tabular-nums' }}>
                {value}
              </Typography>
              <Typography sx={{ fontSize: 12.5, color: t.textSecondary }}>{label}</Typography>
              <Typography sx={{ fontSize: 11.5, color: t.textFaint, mt: 0.25 }}>{hint}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Sync state as one sentence rather than three tinted boxes. */}
      <Box
        sx={{
          ...PANEL_SX, py: 2, mb: 3,
          display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 3, rowGap: 1,
        }}
      >
        <Typography sx={EYEBROW_SX}>AUTOMATED SOURCE SYNC</Typography>
        <Typography sx={{ fontSize: 13.5, color: t.textSecondary }}>
          {syncStatus?.territoriesSyncing == null
            ? 'No territories are configured for automated syncing.'
            : `${syncStatus.territoriesSyncing} ${syncStatus.territoriesSyncing === 1 ? 'territory syncs' : 'territories sync'} from official sources.`}
          {' '}
          {syncStatus?.daysSinceLastCheck == null
            ? 'No check has run yet.'
            : `Last checked ${syncStatus.daysSinceLastCheck} ${syncStatus.daysSinceLastCheck === 1 ? 'day' : 'days'} ago.`}
          {' '}
          Next scheduled {formatDate(syncStatus?.nextScheduledCheck)}.
        </Typography>
      </Box>

      {pendingChanges.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
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
          <strong>
            {pendingChanges.length} {pendingChanges.length === 1 ? 'update' : 'updates'} detected
          </strong>{' '}
          by the automated source sync. Nothing is applied until you approve it.
        </Alert>
      )}

      <Collapse in={showPendingChanges}>
        <Box sx={{ mb: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={EYEBROW_SX}>PENDING GRANT CHANGES</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
              Each one replaces a stored value on approval and is written to the audit trail.
            </Typography>
          </Box>
          {pendingChanges.map((change, index) => (
            <Box
              key={change.id}
              sx={{
                p: 3,
                borderBottom: index < pendingChanges.length - 1 ? 1 : 0,
                borderColor: 'divider',
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                gap: 2, flexWrap: 'wrap',
              }}
            >
              <Box sx={{ flex: '1 1 320px', minWidth: 0 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: 'text.primary', mb: 1 }}>
                  {change.territory}: {change.field}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Stored value</Typography>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.primary' }}>
                      {change.currentValue ?? 'Not set'}
                    </Typography>
                  </Box>
                  <Typography sx={{ color: 'text.secondary', fontSize: 18 }}>&rarr;</Typography>
                  <Box>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>Detected value</Typography>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'success.main' }}>
                      {change.detectedValue}
                    </Typography>
                  </Box>
                </Box>
                <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 1 }}>
                  {change.confidence} confidence, from {change.source}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<CheckCircle />}
                  onClick={() => void handleApproveChange(change)}
                >
                  Approve
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => void handleRejectChange(change)}
                  sx={{ borderColor: 'divider', color: 'text.secondary' }}
                >
                  Reject
                </Button>
              </Box>
            </Box>
          ))}
        </Box>
      </Collapse>

      {/* One scope control. The eight standalone filter dropdowns duplicated the
          table's own per-column filters and pushed the grants below the fold. */}
      <Box sx={{ mb: 2 }}>
        <SegmentedToggle
          value={scope}
          onChange={(v) => setScope(v as Scope)}
          options={[
            { value: 'all', label: `All ${filteredGrants.length}` },
            { value: 'unverified', label: `Unverified ${filteredGrants.filter((g) => !g.verified).length}` },
            { value: 'closing', label: `Closing soon ${stats.closingSoon}` },
          ]}
        />
      </Box>

      <GrantsTable
        key={scope}
        grants={scopedGrants}
        onEdit={openEditDialog}
        onPreview={openPreviewDialog}
        onDelete={openDeleteDialog}
        onToggleVerified={toggleVerified}
        formatCurrency={formatCurrency}
        getStatusColor={getStatusColor}
        emptyMessage={scope === 'unverified'
          ? 'Every grant has been verified.'
          : scope === 'closing'
            ? 'No grant is closing soon.'
            : 'No grants have been recorded. Reports match soft money against this table.'}
      />

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
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
      >
        <DialogTitle sx={{ color: 'text.primary' }}>
          Delete Grant
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.secondary' }}>
            Are you sure you want to delete "{selectedGrant?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setDeleteConfirmOpen(false);
            setSelectedGrant(null);
          }} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteGrant}
            sx={{
              bgcolor: 'error.main',
              color: 'text.primary',
              '&:hover': {
                bgcolor: 'error.dark',
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
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 600 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule />
            Auto Sync Configuration
          </Box>
        </DialogTitle>
        <DialogContent>
          {syncSettingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(33, 150, 243, 0.1)', color: 'info.main' }}>
                <strong>How it works:</strong> Our scraper reads official grants sources, extracts structured changes,
                and queues them for admin moderation before they are applied.
              </Alert>

              {syncSettings && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, border: 1, borderColor: 'divider' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Last sync: <strong style={{ color: 'text.primary' }}>{formatDate(syncSettings.lastSyncAt)}</strong>
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                    Next scheduled: <strong style={{ color: 'text.primary' }}>{formatDate(syncSettings.nextScheduledCheck)}</strong>
                  </Typography>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
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
          <Button onClick={() => setSyncDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveSyncSettings}
            disabled={syncSettingsLoading}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.main' },
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
  /** Shown when the current scope has no rows, phrased for that scope. */
  emptyMessage: string;
}

// Staleness flags, derived for DISPLAY only, from stored dates. The stored
// status/verification themselves are never recomputed or overwritten.
function stalenessFlags(g: Grant): { label: string; colour: string }[] {
  const flags: { label: string; colour: string }[] = [];
  const dl = g.applicationDeadline || '';
  if (dl && dl.toLowerCase() !== 'rolling' && !/^tbc/i.test(dl)) {
    const d = Date.parse(dl);
    if (!Number.isNaN(d) && d < Date.now()) flags.push({ label: 'Deadline has passed', colour: 'error.main' });
  }
  if (g.lastVerifiedAt) {
    const ageDays = (Date.now() - Date.parse(g.lastVerifiedAt)) / 86400000;
    if (ageDays > 183) flags.push({ label: 'Stale, over 6 months old', colour: 'error.main' });
    else if (ageDays > 122) flags.push({ label: 'Re-verify, over 4 months old', colour: 'warning.main' });
  } else {
    flags.push({ label: 'Never verified', colour: 'error.main' });
  }
  return flags;
}

function GrantsTable({
  grants,
  onEdit,
  onPreview,
  onDelete,
  onToggleVerified,
  formatCurrency,
  getStatusColor,
  emptyMessage,
}: GrantsTableProps) {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const fmtDate = (s?: string | null) => {
    if (!s) return null;
    if (s.toLowerCase?.() === 'rolling') return 'Rolling';
    if (/^tbc/i.test(s)) return s.toUpperCase();
    const d = Date.parse(s);
    return Number.isNaN(d) ? s : new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const columns = useMemo<Column<Grant>[]>(() => [
    {
      key: 'title', header: 'GRANT', width: '2fr',
      sortValue: (g) => g.title || '',
      render: (g) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {g.title}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {g.fundingBody}
          </Typography>
          {/* Only the conditions that disqualify an applicant are surfaced here.
              Everything descriptive lives in the preview. */}
          {(g.nationality_required || g.co_production_required) && (
            <Typography sx={{ fontSize: 11, fontWeight: 700, color: t.warning, mt: 0.3 }}>
              {[g.nationality_required && 'Nationality required', g.co_production_required && 'Co-production required']
                .filter(Boolean).join(' + ')}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'territory', header: 'TERRITORY', width: '1.1fr',
      sortValue: (g) => g.territory || '',
      render: (g) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {g.territory}
          </Typography>
          {g.continent && <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>{g.continent}</Typography>}
        </Box>
      ),
    },
    {
      key: 'grant_type', header: 'TYPE', width: '1.1fr',
      sortValue: (g) => g.grant_type || '',
      render: (g) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13, color: g.grant_type ? t.textSecondary : t.textFaint }}>
            {g.grant_type || 'Unclassified'}
          </Typography>
          {g.recurrence && <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>{g.recurrence}</Typography>}
        </Box>
      ),
    },
    {
      key: 'eligibility', header: 'FORMATS AND GENRES', width: '1.6fr',
      sortValue: (g) => [...(g.eligible_formats || []), ...(g.genre_tags || [])].join(', '),
      render: (g) => {
        const formats = g.eligible_formats || [];
        const genres = g.genre_tags || [];
        if (!formats.length && !genres.length) {
          return <Typography sx={{ fontSize: 12.5, color: t.textFaint }}>Open to any format</Typography>;
        }
        return (
          <Box sx={{ minWidth: 0 }}>
            {formats.length > 0 && (
              <Typography sx={{ fontSize: 12.5, color: t.textSecondary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formats.join(', ')}
              </Typography>
            )}
            {genres.length > 0 && (
              <Tooltip title={genres.join(', ')}>
                <Typography sx={{ fontSize: 11.5, color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {genres.slice(0, 4).join(', ')}
                  {genres.length > 4 ? ` and ${genres.length - 4} more` : ''}
                </Typography>
              </Tooltip>
            )}
          </Box>
        );
      },
    },
    {
      key: 'maxAmount', header: 'AMOUNT', width: '1.2fr', align: 'right',
      // Sorts on the approximate USD figure so amounts in different currencies
      // are actually comparable; the display value stays in its own currency.
      sortValue: (g) => g.amount_usd_approx ?? -1,
      render: (g) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: g.maxAmount ? t.textPrimary : t.textFaint, fontVariantNumeric: 'tabular-nums' }}>
            {g.maxAmount ? formatCurrency(g.maxAmount, g.currency) : 'Not stated'}
          </Typography>
          {g.amount_usd_approx != null && (
            <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>
              about ${g.amount_usd_approx.toLocaleString()} USD
            </Typography>
          )}
          {(g.budget_min_usd != null || g.budget_max_usd != null) && (
            <Typography sx={{ fontSize: 11, color: t.textFaint }}>
              budget {g.budget_min_usd != null ? `$${g.budget_min_usd.toLocaleString()}` : 'any'} to{' '}
              {g.budget_max_usd != null ? `$${g.budget_max_usd.toLocaleString()}` : 'any'}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'applicationDeadline', header: 'DEADLINE', width: '1.2fr',
      sortValue: (g) => {
        const d = Date.parse(g.applicationDeadline || '');
        // Rolling and unset deadlines sort last: they are never the urgent ones.
        return Number.isNaN(d) ? Number.MAX_SAFE_INTEGER : d;
      },
      render: (g) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, color: t.textPrimary }}>
            {fmtDate(g.applicationDeadline) || 'Not stated'}
          </Typography>
          {g.applicationOpens && (
            <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>opens {fmtDate(g.applicationOpens)}</Typography>
          )}
          {g.daysUntilDeadline != null && g.daysUntilDeadline > 0 && (
            <Typography sx={{ fontSize: 11.5, color: g.daysUntilDeadline <= 14 ? t.warning : t.textFaint }}>
              {g.daysUntilDeadline} days left as at last verification
            </Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'status', header: 'STATUS', width: '1.4fr',
      sortValue: (g) => String(g.status || 'zzz'),
      render: (g) => {
        const flags = stalenessFlags(g);
        return (
          <Box sx={{ minWidth: 0 }}>
            {g.status ? (
              <Chip
                size="small"
                label={String(g.status).replace(/[-_]/g, ' ')}
                sx={{
                  bgcolor: `${getStatusColor(g.status)}22`,
                  color: getStatusColor(g.status),
                  fontWeight: 600, fontSize: '0.7rem',
                }}
              />
            ) : (
              <Chip size="small" variant="outlined" label="Status unset" sx={{ borderColor: t.border, color: t.textFaint, fontSize: '0.7rem' }} />
            )}
            <Typography sx={{ fontSize: 11.5, color: t.textFaint, mt: 0.4 }}>
              {g.lastVerifiedAt ? `verified ${fmtDate(g.lastVerifiedAt)}` : 'never verified'}
            </Typography>
            {/* Derived from the stored dates for display only. The stored status
                and verification fields are never recomputed or overwritten. */}
            {flags.map((f) => (
              <Typography key={f.label} sx={{ fontSize: 11, fontWeight: 700, color: f.colour }}>
                {f.label}
              </Typography>
            ))}
          </Box>
        );
      },
    },
    {
      key: 'dataSource', header: 'SOURCE', width: '1fr',
      sortValue: (g) => g.dataSource || '',
      render: (g) => (
        <Box sx={{ minWidth: 0 }}>
          {g.websiteUrl ? (
            <Link
              href={g.websiteUrl}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              sx={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 0.4 }}
            >
              Official page <OpenInNew sx={{ fontSize: 12 }} />
            </Link>
          ) : (
            <Typography sx={{ fontSize: 12, fontWeight: 700, color: t.error }}>No source URL</Typography>
          )}
          <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>{g.dataSource}</Typography>
        </Box>
      ),
    },
  ], [t, formatCurrency, getStatusColor]);

  return (
    <DataTable<Grant>
      title="Funding programmes"
      columns={columns}
      rows={grants}
      getRowId={(g) => g.id}
      pageSize={12}
      itemNoun="grant"
      minWidth={1400}
      maxHeight={640}
      onRowClick={onPreview}
      emptyIcon={<VolunteerActivismOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
      emptyMessage={emptyMessage}
      rowActions={(g) => (
        <>
          <Tooltip title={g.verified ? 'Mark as unverified' : 'Mark as verified'}>
            <IconButton
              size="small"
              onClick={() => onToggleVerified(g.id)}
              sx={{ color: g.verified ? t.success : t.textFaint, '&:hover': { color: t.gold } }}
            >
              <CheckCircle sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit this grant">
            <IconButton size="small" onClick={() => onEdit(g)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
              <Edit sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete this grant">
            <IconButton size="small" onClick={() => onDelete(g)} sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}>
              <Delete sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </>
      )}
    />
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

const formSection = { color: 'primary.main', fontWeight: 700, mt: 2.5, mb: 1, fontSize: '0.8rem', letterSpacing: 1, textTransform: 'uppercase' } as const;

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
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
    >
      <DialogTitle sx={{ color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
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
              <MenuItem value="">, </MenuItem>
              {['public_fund', 'broadcaster', 'foundation', 'co_production'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField select fullWidth size="small" label="Recurrence" value={formData.recurrence} onChange={set('recurrence')}>
              <MenuItem value="">, </MenuItem>
              <MenuItem value="annual">annual</MenuItem>
              <MenuItem value="rolling">rolling</MenuItem>
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField select fullWidth size="small" label="Production stage" value={formData.productionStage} onChange={set('productionStage')}>
              <MenuItem value="">(not stated)</MenuItem>
              {['development', 'production', 'short', 'multi'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
          </Grid>
        </Grid>

        <Typography sx={formSection}>Eligibility &amp; matching</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Eligible formats (comma-separated)"
              helperText="feature, short, documentary, tv_series, animation, matcher format gate"
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
              onChange={(e: any) => setFormData({ ...formData, nationality_required: e.target.checked })} sx={{ color: 'warning.main' }} />}
              label="Nationality / residency restriction" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Checkbox checked={!!formData.co_production_required}
              onChange={(e: any) => setFormData({ ...formData, co_production_required: e.target.checked })} sx={{ color: 'info.main' }} />}
              label="Co-production required" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Checkbox checked={formData.emergingFilmmaker === true}
              indeterminate={formData.emergingFilmmaker == null}
              onChange={(e: any) => setFormData({ ...formData, emergingFilmmaker: e.target.checked })} sx={{ color: 'info.main' }} />}
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
            <TextField fullWidth size="small" label="Deadline (YYYY-MM-DD, rolling or tbc...)" value={formData.applicationDeadline} onChange={set('applicationDeadline')} />
          </Grid>
        </Grid>

        <Typography sx={formSection}>Governance, honest defaults, nothing auto-filled</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <TextField fullWidth size="small" label="Website / source URL * (required, no grant without a source)"
              value={formData.websiteUrl} onChange={set('websiteUrl')} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField select fullWidth size="small" label="Status (explicit, never auto-computed)"
              helperText="Unset = excluded from reports"
              value={formData.status} onChange={set('status')}>
              <MenuItem value="">Not set</MenuItem>
              {['open', 'opening_soon', 'closing_soon', 'closed'].map(s => <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <FormControlLabel control={<Checkbox checked={!!formData.verified}
              onChange={(e: any) => setFormData({ ...formData, verified: e.target.checked })} sx={{ color: 'success.main' }} />}
              label="Verified (requires a verification date)" />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" type="date" label="Verification date (explicit)"
              InputLabelProps={{ shrink: true }}
              value={formData.lastVerifiedAt} onChange={set('lastVerifiedAt')} />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider', position: 'sticky', bottom: 0, bgcolor: 'background.paper' }}>
        <Button onClick={onClose} sx={{ color: 'text.secondary' }}>Cancel</Button>
        <Button variant="contained" onClick={onSave}
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, '&:hover': { bgcolor: 'primary.dark' } }}>
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
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
    >
      <DialogTitle sx={{ color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
        Grant Preview (User View)
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        {/* This mimics the user-facing grant card */}
        <Paper
          sx={{
            p: 2.5,
            bgcolor: grant.status === 'closing-soon' ? 'rgba(255, 152, 0, 0.05)' : 'action.hover',
            border: grant.status === 'closing-soon' ? 2 : 1,
            borderColor: grant.status === 'closing-soon' ? 'warning.main' : 'divider',
          }}
        >
          <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
            {grant.title}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip label={grant.territory} size="small" sx={{ bgcolor: 'action.hover', color: 'primary.main' }} />
            <Chip label={grant.fundingBody} size="small" sx={{ bgcolor: 'rgba(33, 150, 243, 0.2)', color: 'info.main' }} />
            <Chip 
              label={`Max: ${formatCurrency(grant.maxAmount, grant.currency)}`}
              size="small"
              sx={{ bgcolor: 'rgba(76, 175, 80, 0.2)', color: 'success.main', fontWeight: 600 }}
            />
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 4 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Opens</Typography>
              <Typography variant="body2" sx={{ color: 'text.primary' }}>
                {new Date(grant.applicationOpens).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Deadline</Typography>
              <Typography variant="body2" sx={{ color: grant.status === 'closing-soon' ? 'warning.main' : 'text.primary', fontWeight: grant.status === 'closing-soon' ? 700 : 500 }}>
                {new Date(grant.applicationDeadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </Typography>
            </Grid>
            <Grid size={{ xs: 4 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Time Left</Typography>
              <Typography variant="body2" sx={{ color: (grant.daysUntilDeadline ?? 99) <= 14 ? 'warning.main' : 'success.main', fontWeight: 600 }}>
                {grant.daysUntilDeadline} days
              </Typography>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>Eligibility</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {grant.eligibility.slice(0, 3).map((criteria, idx) => (
                <Chip
                  key={idx}
                  label={criteria}
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    color: 'text.secondary',
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
              borderColor: 'primary.main',
              color: 'primary.main',
              fontWeight: 600,
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            Apply now
          </Button>
        </Paper>
      </DialogContent>
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={onClose} sx={{ color: 'primary.main' }}>
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
      slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
    >
      <DialogTitle sx={{ color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
        Bulk Import Grants
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(33, 150, 243, 0.1)', '& .MuiAlert-icon': { color: 'info.main' } }}>
          <Typography variant="body2" sx={{ color: 'info.main' }}>
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
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              borderColor: 'primary.main',
              bgcolor: 'action.hover',
            },
          }}
        >
          Download CSV Template
        </Button>

        <Button
          variant="contained"
          component="label"
          startIcon={uploading ? <CircularProgress size={16} sx={{ color: 'primary.contrastText' }} /> : <Upload />}
          fullWidth
          disabled={uploading}
          sx={{
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            fontWeight: 600,
            '&:hover': { bgcolor: 'primary.main' },
            '&:disabled': { bgcolor: 'action.hover' },
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
      <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Button onClick={handleClose} sx={{ color: 'text.secondary' }}>
          {result ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
