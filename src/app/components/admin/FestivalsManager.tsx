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
  Warning,
  Schedule,
  Sync,
  Refresh,
  ExpandMore,
  ExpandLess,
  Movie,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { Festival, FestivalDeadline } from '@/app/types/festival';
import { adminApi } from '@/services/admin.api';
import type { PendingChange, SyncStatus, SyncSettings, SyncSettingsUpdate } from '@/services/admin.types';
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
  const [currentTab, setCurrentTab] = useState(0);
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
    if (!dateStr) return 'N/A';
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
      'a-list': '#D4AF37',
      'tier-2': '#2196F3',
      'regional': '#9c27b0',
      'specialized': '#ff9800',
    };
    return colors[tier];
  };

  const getStatusBadgeColor = (status: Festival['currentStatus']) => {
    const colors = {
      'early-bird-open': '#4caf50',
      'regular-open': '#2196F3',
      'late-open': '#ff9800',
      'upcoming': '#9c27b0',
      'closed': '#666666',
    };
    return colors[status];
  };

  return (
    <Box sx={{ p: 4, bgcolor: 'primary.contrastText', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage festival deadlines and submission information
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={handleOpenSyncSettings}
            sx={{
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(212, 175, 55, 0.1)' },
            }}
          >
            Auto Sync Settings
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 600,
              '&:hover': { bgcolor: 'primary.main' },
            }}
          >
            Add Festival
          </Button>
        </Box>
      </Box>

      {fetchError && (
        <Alert severity="error" sx={{ mb: 3 }}>{fetchError}</Alert>
      )}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Total Festivals
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(76, 175, 80, 0.2)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: 'success.main', fontWeight: 700 }}>
                {stats.verified}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Verified Festivals
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(33, 150, 243, 0.2)' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: '#2196F3', fontWeight: 700 }}>
                {stats.upcoming}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Upcoming/Open
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
            <CardContent>
              <Typography variant="h3" sx={{ color: 'primary.main', fontWeight: 700 }}>
                {stats.aList}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                A List Festivals
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* AI Auto-Sync Status */}
      <Card sx={{ mb: 4, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Sync sx={{ color: 'primary.main', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  AI Powered Auto Sync Status
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Next scheduled check: <strong>{formatDate(syncStatus?.nextScheduledCheck)}</strong>
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={syncing ? <CircularProgress size={16} sx={{ color: 'primary.contrastText' }} /> : <Refresh />}
              onClick={handleTriggerSync}
              disabled={syncing}
              sx={{
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 600,
                '&:hover': { bgcolor: 'primary.main' },
              }}
            >
              {syncing ? 'Syncing...' : 'Run Sync Now'}
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(102, 187, 106, 0.1)', borderRadius: 2, border: '1px solid rgba(102, 187, 106, 0.3)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />
                  <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>
                    {syncStatus?.territoriesSyncing ?? 'N/A'}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Territories Auto Syncing
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(255, 167, 38, 0.1)', borderRadius: 2, border: '1px solid rgba(255, 167, 38, 0.3)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
                  <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>
                    {pendingChanges.length}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Pending Updates
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Box sx={{ p: 2, bgcolor: 'rgba(66, 165, 245, 0.1)', borderRadius: 2, border: '1px solid rgba(66, 165, 245, 0.3)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Schedule sx={{ color: 'info.main', fontSize: 20 }} />
                  <Typography variant="h5" sx={{ color: 'text.primary', fontWeight: 700 }}>
                    {syncStatus?.daysSinceLastCheck ?? 'N/A'}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
            color: 'text.primary',
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
        <Paper sx={{ mb: 4, bgcolor: 'background.paper', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
          <Box sx={{ p: 2, bgcolor: 'rgba(255, 152, 0, 0.05)' }}>
            <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 600 }}>
              Pending Festival Changes for Review
            </Typography>
          </Box>
          {pendingChanges.map((change, index) => {
            const confidence = ['high', 'medium', 'low'].includes(change.confidence)
              ? change.confidence
              : 'medium';
            return (
              <Box
                key={change.id}
                sx={{
                  p: 3,
                  borderBottom: index < pendingChanges.length - 1 ? '1px solid rgba(255, 152, 0, 0.1)' : 'none',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="subtitle1" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
                      {change.territory}: {change.field}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Current Value:
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                          {change.currentValue ?? 'N/A'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ color: 'text.secondary' }}>→</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Detected Value:
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                          {change.detectedValue}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Chip
                        label={`${confidence.toUpperCase()} CONFIDENCE`}
                        size="small"
                        sx={{
                          bgcolor: confidence === 'high' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                          color: confidence === 'high' ? '#66bb6a' : '#ffa726',
                          fontWeight: 600,
                        }}
                      />
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
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
                        bgcolor: 'success.main',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'success.main' },
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
                        color: 'text.secondary',
                        '&:hover': { borderColor: '#999', bgcolor: 'rgba(255, 255, 255, 0.05)' },
                      }}
                    >
                      Reject
                    </Button>
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Paper>
      </Collapse>

      {/* Tabs */}
      <Paper sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          sx={{
            borderBottom: '1px solid rgba(212, 175, 55, 0.2)',
            '& .MuiTab-root': { color: 'text.secondary' },
            '& .Mui-selected': { color: 'primary.main' },
            '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
          }}
        >
          <Tab label={`All Festivals (${festivals.length})`} />
          <Tab label={`A List (${festivals.filter(f => f.tier === 'a-list').length})`} />
          <Tab label={`Tier 2 (${festivals.filter(f => f.tier === 'tier-2').length})`} />
          <Tab label={`Specialized (${festivals.filter(f => f.tier === 'specialized').length})`} />
        </Tabs>

        <TabPanel value={currentTab} index={0}>
          <FestivalTable
            festivals={festivals}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteClick}
            onToggleVerified={handleToggleVerified}
            getTierBadgeColor={getTierBadgeColor}
            getStatusBadgeColor={getStatusBadgeColor}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={1}>
          <FestivalTable
            festivals={festivals.filter(f => f.tier === 'a-list')}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteClick}
            onToggleVerified={handleToggleVerified}
            getTierBadgeColor={getTierBadgeColor}
            getStatusBadgeColor={getStatusBadgeColor}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={2}>
          <FestivalTable
            festivals={festivals.filter(f => f.tier === 'tier-2')}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteClick}
            onToggleVerified={handleToggleVerified}
            getTierBadgeColor={getTierBadgeColor}
            getStatusBadgeColor={getStatusBadgeColor}
          />
        </TabPanel>

        <TabPanel value={currentTab} index={3}>
          <FestivalTable
            festivals={festivals.filter(f => f.tier === 'specialized' || f.tier === 'regional')}
            onEdit={handleOpenDialog}
            onDelete={handleDeleteClick}
            onToggleVerified={handleToggleVerified}
            getTierBadgeColor={getTierBadgeColor}
            getStatusBadgeColor={getStatusBadgeColor}
          />
        </TabPanel>
      </Paper>

      {/* Add/Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: 1, borderColor: 'divider',
          },
        }}
      >
        <DialogTitle sx={{ color: 'text.primary', borderBottom: '1px solid rgba(212, 175, 55, 0.2)' }}>
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
                      sx={{ color: '#ff6b6b' }}
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
        <DialogActions sx={{ p: 2, borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
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
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: 1, borderColor: 'divider',
          },
        }}
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
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            border: 1, borderColor: 'divider',
          },
        }}
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
              bgcolor: '#ff6b6b',
              color: 'text.primary',
              '&:hover': { bgcolor: '#ff5252' },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Festival Table Component
function FestivalTable({
  festivals,
  onEdit,
  onDelete,
  onToggleVerified,
  getTierBadgeColor,
  getStatusBadgeColor,
}: {
  festivals: Festival[];
  onEdit: (festival: Festival) => void;
  onDelete: (festival: Festival) => void;
  onToggleVerified: (festivalId: string) => void;
  getTierBadgeColor: (tier: Festival['tier']) => string;
  getStatusBadgeColor: (status: Festival['currentStatus']) => string;
}) {
  if (festivals.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          No festivals found in this category
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>Festival</TableCell>
            <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>Location</TableCell>
            <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>Next Deadline</TableCell>
            <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>Status</TableCell>
            <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>Tier</TableCell>
            <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>Verified</TableCell>
            <TableCell sx={{ color: 'primary.main', fontWeight: 600 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {festivals.map((festival) => (
            <TableRow key={festival.id}>
              <TableCell sx={{ color: 'text.primary' }}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {festival.name} {festival.year}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {festival.festivalDates}
                  </Typography>
                </Box>
              </TableCell>
              <TableCell sx={{ color: 'text.secondary', fontSize: '0.875rem' }}>
                {festival.location}
              </TableCell>
              <TableCell sx={{ color: 'text.primary' }}>
                {festival.nextDeadline ? (
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                      {new Date(festival.nextDeadline.date).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'primary.main' }}>
                      {festival.daysUntilNextDeadline && `${festival.daysUntilNextDeadline} days`}
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: '#666666' }}>N/A</Typography>
                )}
              </TableCell>
              <TableCell>
                <Chip
                  label={festival.currentStatus.replace('-', ' ')}
                  size="small"
                  sx={{
                    bgcolor: `${getStatusBadgeColor(festival.currentStatus)}20`,
                    color: getStatusBadgeColor(festival.currentStatus),
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={festival.tier}
                  size="small"
                  sx={{
                    bgcolor: `${getTierBadgeColor(festival.tier)}20`,
                    color: getTierBadgeColor(festival.tier),
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
              </TableCell>
              <TableCell>
                <Switch
                  checked={festival.verified}
                  onChange={() => onToggleVerified(festival.id)}
                  size="small"
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': { color: 'success.main' },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'success.main' },
                  }}
                />
              </TableCell>
              <TableCell>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => onEdit(festival)}
                    sx={{ color: '#2196F3' }}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onDelete(festival)}
                    sx={{ color: '#ff6b6b' }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
