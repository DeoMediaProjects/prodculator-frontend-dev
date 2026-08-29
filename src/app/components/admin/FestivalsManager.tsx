import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Tooltip,
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
  Grid,
  Switch,
  FormControlLabel,
  Autocomplete,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  CheckCircle,
  Schedule,
  Movie,
  Sync,
  Refresh,
  ExpandMore,
  ExpandLess,
  CelebrationOutlined,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { Festival, FestivalDeadline } from '@/app/types/festival';
import { adminApi } from '@/services/admin.api';
import type { PendingChange, SyncStatus, SyncSettings, SyncSettingsUpdate } from '@/services/admin.types';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { EYEBROW_SX, PANEL_SX } from './adminSurfaces';
import { AdminAccessDenied } from './AdminAccessDenied';


/** Stored slug to sentence case: "past_due" reads "Past due". Used for both the
 *  cell and its filter option, so a dropdown choice reads the way the row does. */
function sentence(value: string): string {
  const spaced = value.replace(/[_-]+/g, ' ').trim();
  return `${spaced.charAt(0).toUpperCase()}${spaced.slice(1)}`;
}

/** Which tier of the circuit an admin is working through. */
type TierScope = 'all' | 'a-list' | 'tier-2' | 'specialized';

export function FestivalsManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canEditIncentiveData')) {
    return (
      <AdminAccessDenied
        requiredPermission="Edit Incentive Data"
        requiredRole="Master Admin, Senior Admin, or Data Admin"
      />
    );
  }

  return <FestivalsManagerContent />;
}

function FestivalsManagerContent() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [festivals, setFestivals] = useState<Festival[]>([]);
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    (async () => {
      const [festivalsRes, syncStatusRes, pendingRes] = await Promise.all([
        adminApi.getFestivals(),
        adminApi.getFestivalSyncStatus(),
        adminApi.getFestivalPendingChanges(),
      ]);

      if (festivalsRes.error) setFetchError(festivalsRes.error);
      else setFestivals(festivalsRes.data?.items ?? []);

      if (syncStatusRes.error) setSyncErrorMessage(syncStatusRes.error);
      else if (syncStatusRes.data) setSyncStatus(syncStatusRes.data);

      if (pendingRes.error) setSyncErrorMessage(pendingRes.error);
      else if (pendingRes.data) setPendingChanges(pendingRes.data);

      setLoading(false);
    })();
  }, []);

  const loadFestivals = async () => {
    const { data, error } = await adminApi.getFestivals();
    if (error) setFetchError(error);
    else setFestivals(data?.items ?? []);
  };

  const refreshSyncData = async () => {
    const [syncStatusRes, pendingRes] = await Promise.all([
      adminApi.getFestivalSyncStatus(),
      adminApi.getFestivalPendingChanges(),
    ]);

    if (syncStatusRes.error) setSyncErrorMessage(syncStatusRes.error);
    else if (syncStatusRes.data) setSyncStatus(syncStatusRes.data);

    if (pendingRes.error) setSyncErrorMessage(pendingRes.error);
    else if (pendingRes.data) setPendingChanges(pendingRes.data);
  };

  const [editingFestival, setEditingFestival] = useState<Festival | null>(null);
  const [tier, setTier] = useState<TierScope>('all');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [festivalToDelete, setFestivalToDelete] = useState<Festival | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Festival>>({
    name: '',
    year: new Date().getFullYear() + 1,
    genres: [],
    budgetTiers: [],
    location: '',
    festivalDates: '',
    premiereRequirement: 'none',
    deadlines: [
      { tier: 'early-bird', date: '', fee: 0, currency: 'USD' },
    ],
    tier: 'regional',
    acceptanceRate: 0.1,
    websiteUrl: '',
    filmfreewayUrl: '',
    dataSource: 'manual',
    verified: true,
    isNew: true,
    notes: '',
  });

  const stats = {
    total: festivals.length,
    verified: festivals.filter(f => f.verified).length,
    upcoming: festivals.filter(f => f.currentStatus !== 'closed').length,
    aList: festivals.filter(f => f.tier === 'a-list').length,
  };

  const genreOptions = [
    'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci Fi', 'Fantasy',
    'Documentary', 'Animation', 'Action', 'Romance', 'Mystery',
    'Art House', 'International', 'Experimental', 'Short Films',
    'Music', 'Political', 'European Cinema', 'British Cinema',
    'All Genres',
  ];

  const handleOpenDialog = (festival?: Festival) => {
    if (festival) {
      setEditingFestival(festival);
      setFormData(festival);
    } else {
      setEditingFestival(null);
      setFormData({
        name: '',
        year: new Date().getFullYear() + 1,
        genres: [],
        budgetTiers: [],
        location: '',
        festivalDates: '',
        premiereRequirement: 'none',
        deadlines: [
          { tier: 'early-bird', date: '', fee: 0, currency: 'USD' },
        ],
        tier: 'regional',
        acceptanceRate: 0.1,
        websiteUrl: '',
        filmfreewayUrl: '',
        dataSource: 'manual',
        verified: true,
        isNew: true,
        notes: '',
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingFestival(null);
  };

  const handleSave = async () => {
    if (editingFestival) {
      const payload: Festival = { ...formData as Festival, id: editingFestival.id, updatedAt: new Date().toISOString() };
      const { data, error } = await adminApi.updateFestival(editingFestival.id, payload);
      if (!error && data) {
        setFestivals(festivals.map(f => f.id === editingFestival.id ? data : f));
      }
    } else {
      const payload: Festival = {
        ...formData as Festival,
        id: '',
        currentStatus: 'upcoming',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastVerifiedAt: new Date().toISOString(),
      };
      const { data, error } = await adminApi.createFestival(payload);
      if (!error && data) {
        setFestivals([...festivals, data]);
      }
    }
    handleCloseDialog();
  };

  const handleDeleteClick = (festival: Festival) => {
    setFestivalToDelete(festival);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (festivalToDelete) {
      const { error } = await adminApi.deleteFestival(festivalToDelete.id);
      if (!error) {
        setFestivals(festivals.filter(f => f.id !== festivalToDelete.id));
      }
    }
    setDeleteConfirmOpen(false);
    setFestivalToDelete(null);
  };

  const handleToggleVerified = async (festivalId: string) => {
    const target = festivals.find(f => f.id === festivalId);
    if (!target) return;
    const payload: Festival = {
      ...target,
      verified: !target.verified,
      lastVerifiedAt: !target.verified ? new Date().toISOString() : target.lastVerifiedAt,
    };
    const { data, error } = await adminApi.updateFestival(festivalId, payload);
    if (!error && data) {
      setFestivals(festivals.map(f => f.id === festivalId ? data : f));
    }
  };

  const handleTriggerSync = async () => {
    setSyncSuccessMessage(null);
    setSyncErrorMessage(null);
    setSyncing(true);

    const { error } = await adminApi.triggerFestivalSync();
    setSyncing(false);

    if (error) {
      setSyncErrorMessage(error);
      return;
    }

    setSyncSuccessMessage('Festival auto sync started. Detected changes will appear for review.');
    await refreshSyncData();
  };

  const handleApproveChange = async (change: PendingChange) => {
    const { error } = await adminApi.approveFestivalPendingChange(change.id);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }
    await Promise.all([loadFestivals(), refreshSyncData()]);
  };

  const handleRejectChange = async (change: PendingChange) => {
    const { error } = await adminApi.rejectFestivalPendingChange(change.id);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }
    await refreshSyncData();
  };

  const handleOpenSyncSettings = async () => {
    setSyncDialogOpen(true);
    setSyncSettingsLoading(true);
    const { data, error } = await adminApi.getFestivalSyncSettings();
    if (error) {
      setSyncErrorMessage(error);
    } else if (data) {
      setSyncSettings(data);
      setSyncSettingsForm({ schedule: data.schedule ?? undefined, enabled: data.enabled });
    }
    setSyncSettingsLoading(false);
  };

  const handleSaveSyncSettings = async () => {
    const { data, error } = await adminApi.updateFestivalSyncSettings(syncSettingsForm);
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
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const addDeadline = () => {
    setFormData({
      ...formData,
      deadlines: [
        ...(formData.deadlines || []),
        { tier: 'regular', date: '', fee: 0, currency: 'USD' },
      ],
    });
  };

  const updateDeadline = (index: number, field: keyof FestivalDeadline, value: any) => {
    const newDeadlines = [...(formData.deadlines || [])];
    newDeadlines[index] = { ...newDeadlines[index], [field]: value };
    setFormData({ ...formData, deadlines: newDeadlines });
  };

  const removeDeadline = (index: number) => {
    setFormData({
      ...formData,
      deadlines: (formData.deadlines || []).filter((_, i) => i !== index),
    });
  };

  const getTierBadgeColor = (tier: Festival['tier']) => {
    const colors = {
      'a-list': 'primary.main',
      'tier-2': 'info.main',
      'regional': '#9c27b0',
      'specialized': 'warning.main',
    };
    return colors[tier];
  };

  const getStatusBadgeColor = (status: Festival['currentStatus']) => {
    const colors = {
      'early-bird-open': 'success.main',
      'regular-open': 'info.main',
      'late-open': 'warning.main',
      'upcoming': '#9c27b0',
      'closed': 'text.secondary',
    };
    return colors[status];
  };

  const tierCounts = useMemo(() => ({
    'a-list': festivals.filter((f) => f.tier === 'a-list').length,
    'tier-2': festivals.filter((f) => f.tier === 'tier-2').length,
    // Regional festivals sit under Specialised: there are too few to earn a
    // scope of their own, and neither belongs with the A list.
    specialized: festivals.filter((f) => f.tier === 'specialized' || f.tier === 'regional').length,
  }), [festivals]);

  const scopedFestivals = useMemo(() => {
    if (tier === 'all') return festivals;
    if (tier === 'specialized') return festivals.filter((f) => f.tier === 'specialized' || f.tier === 'regional');
    return festivals.filter((f) => f.tier === tier);
  }, [festivals, tier]);

  useHeaderActions(
    <>
      <Button size="small" startIcon={<Refresh />} onClick={() => void handleTriggerSync()} disabled={syncing}>
        {syncing ? 'Syncing' : 'Run sync now'}
      </Button>
      <Button size="small" startIcon={<Sync />} onClick={() => void handleOpenSyncSettings()}>
        Sync settings
      </Button>
      <Button size="small" variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
        Add festival
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

      {/* Verification leads. An unverified festival can still be matched into a
          report on a submission window nobody has confirmed. */}
      <Box sx={{ ...PANEL_SX, mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(230px, 1fr) 2fr' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
        <Box>
          <Typography sx={EYEBROW_SX}>VERIFIED FESTIVALS</Typography>
          <Typography sx={{ fontSize: { xs: 34, md: 42 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {stats.verified}
            <Typography component="span" sx={{ fontSize: 17, fontWeight: 600, color: t.textSecondary }}>
              {' '}of {stats.total}
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 13, color: stats.total - stats.verified > 0 ? t.warning : t.textSecondary, mt: 0.5, fontWeight: stats.total - stats.verified > 0 ? 600 : 400 }}>
            {stats.total - stats.verified > 0
              ? `${stats.total - stats.verified} unverified, so their submission windows are unconfirmed`
              : 'Every festival has been verified against its official page'}
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, 1fr)' }, gap: 2.5 }}>
          {([
            ['Open or upcoming', stats.upcoming, 'Still submittable'],
            ['A list', stats.aList, 'Top-tier circuit'],
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
            ? 'No festivals are configured for automated syncing.'
            : `${syncStatus.territoriesSyncing} ${syncStatus.territoriesSyncing === 1 ? 'source syncs' : 'sources sync'} automatically.`}
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
            <Typography sx={EYEBROW_SX}>PENDING FESTIVAL CHANGES</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
              Each one replaces a stored value on approval and is written to the audit trail.
            </Typography>
          </Box>
          <Box
            sx={{
              maxHeight: 440,
              overflowY: 'auto',
              overscrollBehavior: 'contain',
              '&::-webkit-scrollbar': {
                width: 6,
              },
              '&::-webkit-scrollbar-track': {
                bgcolor: 'transparent',
              },
              '&::-webkit-scrollbar-thumb': {
                bgcolor: 'divider',
                borderRadius: 3,
              },
            }}
          >
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
        </Box>
      </Collapse>

      {/* Tier is a scope, not a filter: the table handles filtering and sorting
          within whichever tier an admin is working through. */}
      <Box sx={{ mb: 2 }}>
        <SegmentedToggle
          value={tier}
          onChange={(v) => setTier(v as TierScope)}
          options={[
            { value: 'all', label: `All ${festivals.length}` },
            { value: 'a-list', label: `A list ${tierCounts['a-list']}` },
            { value: 'tier-2', label: `Tier 2 ${tierCounts['tier-2']}` },
            { value: 'specialized', label: `Specialised ${tierCounts.specialized}` },
          ]}
        />
      </Box>

      <FestivalTable
        key={tier}
        festivals={scopedFestivals}
        onEdit={handleOpenDialog}
        onDelete={handleDeleteClick}
        onToggleVerified={handleToggleVerified}
        getTierBadgeColor={getTierBadgeColor}
        getStatusBadgeColor={getStatusBadgeColor}
        emptyMessage={tier === 'all'
          ? 'No festivals have been recorded. The festival matcher reads from this table.'
          : 'No festivals sit in this tier.'}
      />

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider', } } }}
      >
        <DialogTitle sx={{ color: 'text.primary', borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Movie sx={{ color: 'primary.main' }} />
            {editingFestival ? 'Edit Festival' : 'Add New Festival'}
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            {/* Basic Info */}
            <Grid size={{ xs: 12, sm: 8 }}>
              <TextField
                fullWidth
                label="Festival Name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Year"
                type="number"
                value={formData.year || new Date().getFullYear() + 1}
                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Location"
                value={formData.location || ''}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="e.g. Park City, Utah, USA"
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Festival Dates"
                value={formData.festivalDates || ''}
                onChange={(e) => setFormData({ ...formData, festivalDates: e.target.value })}
                placeholder="e.g. Jan 21 to 31, 2027"
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>

            {/* Genres */}
            <Grid size={{ xs: 12 }}>
              <Autocomplete
                multiple
                options={genreOptions}
                value={formData.genres || []}
                onChange={(_, newValue) => setFormData({ ...formData, genres: newValue })}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Genres Accepted"
                    placeholder="Select genres"
                    sx={{
                      '& .MuiInputLabel-root': { color: 'text.secondary' },
                      '& .MuiOutlinedInput-root': {
                        color: 'text.primary',
                        '& fieldset': { borderColor: 'divider' },
                        '&:hover fieldset': { borderColor: 'primary.main' },
                        '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                      },
                    }}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}
                    />
                  ))
                }
              />
            </Grid>

            {/* Festival Tier & Premiere Req */}
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'text.secondary' }}>Festival Tier</InputLabel>
                <Select
                  value={formData.tier || 'regional'}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as Festival['tier'] })}
                  label="Festival Tier"
                  sx={{
                    color: 'text.primary',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                  }}
                >
                  <MenuItem value="a-list">A List</MenuItem>
                  <MenuItem value="tier-2">Tier 2</MenuItem>
                  <MenuItem value="regional">Regional</MenuItem>
                  <MenuItem value="specialized">Specialized</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'text.secondary' }}>Premiere Requirement</InputLabel>
                <Select
                  value={formData.premiereRequirement || 'none'}
                  onChange={(e) => setFormData({ ...formData, premiereRequirement: e.target.value as Festival['premiereRequirement'] })}
                  label="Premiere Requirement"
                  sx={{
                    color: 'text.primary',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                  }}
                >
                  <MenuItem value="world">World Premiere</MenuItem>
                  <MenuItem value="international">International Premiere</MenuItem>
                  <MenuItem value="us">US Premiere</MenuItem>
                  <MenuItem value="regional">Regional Premiere</MenuItem>
                  <MenuItem value="none">No Requirement</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Acceptance Rate (%)"
                type="number"
                value={(formData.acceptanceRate || 0.1) * 100}
                onChange={(e) => setFormData({ ...formData, acceptanceRate: parseFloat(e.target.value) / 100 })}
                inputProps={{ min: 0, max: 100, step: 0.5 }}
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>

            {/* Deadlines */}
            <Grid size={{ xs: 12 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  Submission Deadlines
                </Typography>
                <Button
                  size="small"
                  onClick={addDeadline}
                  sx={{ color: 'primary.main' }}
                >
                  + Add Deadline
                </Button>
              </Box>
              {(formData.deadlines || []).map((deadline, index) => (
                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: 'text.secondary' }}>Tier</InputLabel>
                      <Select
                        value={deadline.tier}
                        onChange={(e) => updateDeadline(index, 'tier', e.target.value)}
                        label="Tier"
                        sx={{
                          color: 'text.primary',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                        }}
                      >
                        <MenuItem value="early-bird">Early Bird</MenuItem>
                        <MenuItem value="regular">Regular</MenuItem>
                        <MenuItem value="late">Late</MenuItem>
                        <MenuItem value="extended">Extended</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="date"
                      label="Deadline Date"
                      value={deadline.date}
                      onChange={(e) => updateDeadline(index, 'date', e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{
                        '& .MuiInputLabel-root': { color: 'text.secondary' },
                        '& .MuiOutlinedInput-root': {
                          color: 'text.primary',
                          '& fieldset': { borderColor: 'divider' },
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      type="number"
                      label="Fee"
                      value={deadline.fee}
                      onChange={(e) => updateDeadline(index, 'fee', parseFloat(e.target.value))}
                      sx={{
                        '& .MuiInputLabel-root': { color: 'text.secondary' },
                        '& .MuiOutlinedInput-root': {
                          color: 'text.primary',
                          '& fieldset': { borderColor: 'divider' },
                        },
                      }}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 2 }}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: 'text.secondary' }}>Currency</InputLabel>
                      <Select
                        value={deadline.currency}
                        onChange={(e) => updateDeadline(index, 'currency', e.target.value)}
                        label="Currency"
                        sx={{
                          color: 'text.primary',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: 'divider' },
                        }}
                      >
                        <MenuItem value="USD">USD</MenuItem>
                        <MenuItem value="EUR">EUR</MenuItem>
                        <MenuItem value="GBP">GBP</MenuItem>
                        <MenuItem value="CAD">CAD</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid size={{ xs: 12, sm: 1 }}>
                    <IconButton
                      onClick={() => removeDeadline(index)}
                      sx={{ color: 'error.main' }}
                    >
                      <Delete />
                    </IconButton>
                  </Grid>
                </Grid>
              ))}
            </Grid>

            {/* URLs */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="Official Website URL"
                value={formData.websiteUrl || ''}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                placeholder="https://www.festival.com"
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="FilmFreeway URL (Optional)"
                value={formData.filmfreewayUrl || ''}
                onChange={(e) => setFormData({ ...formData, filmfreewayUrl: e.target.value })}
                placeholder="https://filmfreeway.com/festival"
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>

            {/* Notes */}
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Notes (Optional)"
                value={formData.notes || ''}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional information about the festival..."
                sx={{
                  '& .MuiInputLabel-root': { color: 'text.secondary' },
                  '& .MuiOutlinedInput-root': {
                    color: 'text.primary',
                    '& fieldset': { borderColor: 'divider' },
                    '&:hover fieldset': { borderColor: 'primary.main' },
                    '&.Mui-focused fieldset': { borderColor: 'primary.main' },
                  },
                }}
              />
            </Grid>

            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.verified || false}
                    onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
                    sx={{
                      '& .MuiSwitch-switchBase.Mui-checked': { color: 'primary.main' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'primary.main' },
                    }}
                  />
                }
                label={<Typography sx={{ color: 'text.primary' }}>Mark as Verified</Typography>}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={handleCloseDialog} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 600,
              '&:hover': { bgcolor: 'primary.main' },
            }}
          >
            {editingFestival ? 'Save Changes' : 'Add Festival'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Auto-Sync Settings Dialog */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider', } } }}
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
                <strong>How it works:</strong> The scraper reads official festival pages, extracts deadline updates,
                and queues them for moderation before applying.
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider', } } }}
      >
        <DialogTitle sx={{ color: 'text.primary' }}>
          Delete Festival
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: 'text.primary' }}>
            Are you sure you want to delete "{festivalToDelete?.name}"?
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            sx={{
              bgcolor: 'error.main',
              color: 'text.primary',
              '&:hover': { bgcolor: 'error.dark' },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function FestivalTable({
  festivals,
  onEdit,
  onDelete,
  onToggleVerified,
  getTierBadgeColor,
  getStatusBadgeColor,
  emptyMessage,
}: {
  festivals: Festival[];
  onEdit: (festival: Festival) => void;
  onDelete: (festival: Festival) => void;
  onToggleVerified: (festivalId: string) => void;
  getTierBadgeColor: (tier: Festival['tier']) => string;
  getStatusBadgeColor: (status: Festival['currentStatus']) => string;
  /** Shown when the current tier has no rows, phrased for that tier. */
  emptyMessage: string;
}) {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const columns = useMemo<Column<Festival>[]>(() => [
    {
      key: 'name', header: 'FESTIVAL', width: '2fr',
      sortValue: (f) => f.name || '',
      render: (f) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {f.name} {f.year}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {f.festivalDates || 'Dates not recorded'}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'location', header: 'LOCATION', width: '1.3fr',
      render: (f) => (
        <Typography sx={{ fontSize: 13.5, color: f.location ? t.textSecondary : t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {f.location || 'Not recorded'}
        </Typography>
      ),
    },
    {
      key: 'nextDeadline', header: 'NEXT DEADLINE', width: '1.3fr',
      // Festivals with no deadline sort last: they are never the urgent ones.
      sortValue: (f) => (f.nextDeadline ? Date.parse(f.nextDeadline.date) || Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER),
      render: (f) => {
        if (!f.nextDeadline) {
          return <Typography sx={{ fontSize: 13, color: t.textFaint }}>No deadline recorded</Typography>;
        }
        const days = f.daysUntilNextDeadline;
        const urgent = days != null && days <= 21;
        return (
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 13.5, color: t.textPrimary }}>
              {new Date(f.nextDeadline.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Typography>
            {days != null && (
              <Typography sx={{ fontSize: 11.5, fontWeight: urgent ? 700 : 400, color: urgent ? t.warning : t.textFaint }}>
                {days > 0 ? `${days} days left` : 'Closed'}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'currentStatus', header: 'SUBMISSION STATUS', width: '1.2fr', filterSelect: true,
      sortValue: (f) => sentence(f.currentStatus || ''),
      render: (f) => (
        <Chip
          label={sentence(f.currentStatus)}
          size="small"
          sx={{
            bgcolor: `${getStatusBadgeColor(f.currentStatus)}22`,
            color: getStatusBadgeColor(f.currentStatus),
            fontWeight: 600, fontSize: '0.7rem',
          }}
        />
      ),
    },
    {
      key: 'tier', header: 'TIER', width: '1fr', filterSelect: true,
      sortValue: (f) => sentence(f.tier || ''),
      render: (f) => (
        <Chip
          label={sentence(f.tier)}
          size="small"
          sx={{
            bgcolor: `${getTierBadgeColor(f.tier)}22`,
            color: getTierBadgeColor(f.tier),
            fontWeight: 600, fontSize: '0.7rem',
          }}
        />
      ),
    },
    {
      key: 'verified', header: 'VERIFIED', width: '0.8fr', filterSelect: true,
      sortValue: (f) => (f.verified ? 'Yes' : 'No'),
      render: (f) => (
        // Unverified is the state worth noticing: the matcher will still offer
        // the festival to a producer on dates nobody has confirmed.
        <Typography sx={{ fontSize: 13, fontWeight: f.verified ? 400 : 600, color: f.verified ? t.textSecondary : t.warning }}>
          {f.verified ? 'Yes' : 'Not verified'}
        </Typography>
      ),
    },
  ], [t, getStatusBadgeColor, getTierBadgeColor]);

  return (
    <DataTable<Festival>
      title="Festivals"
      columns={columns}
      rows={festivals}
      getRowId={(f) => f.id}
      pageSize={12}
      itemNoun="festival"
      minWidth={1120}
      maxHeight={640}
      emptyIcon={<CelebrationOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
      emptyMessage={emptyMessage}
      rowActions={(f) => (
        <>
          <Tooltip title={f.verified ? 'Mark as unverified' : 'Mark as verified'}>
            <IconButton
              size="small"
              onClick={() => onToggleVerified(f.id)}
              sx={{ color: f.verified ? t.success : t.textFaint, '&:hover': { color: t.gold } }}
            >
              <CheckCircle sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit this festival">
            <IconButton size="small" onClick={() => onEdit(f)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
              <Edit sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete this festival">
            <IconButton size="small" onClick={() => onDelete(f)} sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}>
              <Delete sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        </>
      )}
    />
  );
}
