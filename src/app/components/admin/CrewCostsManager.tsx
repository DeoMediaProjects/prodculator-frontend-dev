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
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Collapse,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Sync,
  Warning,
  CheckCircle,
  Schedule,
  Info,
  Refresh,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { CrewRate, PendingChange, SyncStatus, SyncSettings, SyncSettingsUpdate } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

/** Convert integer cents to a human-readable dollar/currency string */
const formatRate = (cents: number | null | undefined, currency = 'USD') => {
  if (cents == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

export function CrewCostsManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canEditCrewCosts')) {
    return (
      <AdminAccessDenied
        requiredPermission="Edit Crew Costs"
        requiredRole="Master Admin, Senior Admin, or Data Admin"
      />
    );
  }

  return <CrewCostsManagerContent />;
}

function CrewCostsManagerContent() {
  const [crewRates, setCrewRates] = useState<CrewRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<CrewRate | null>(null);
  const [formData, setFormData] = useState<Partial<CrewRate>>({});

  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [showPendingChanges, setShowPendingChanges] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const [syncSettingsForm, setSyncSettingsForm] = useState<SyncSettingsUpdate>({});
  const [syncSettingsLoading, setSyncSettingsLoading] = useState(false);

  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    (async () => {
      const [ratesRes, syncStatusRes, pendingRes] = await Promise.all([
        adminApi.getCrewRates(),
        adminApi.getCrewCostSyncStatus(),
        adminApi.getCrewCostPendingChanges(),
      ]);
      if (ratesRes.error) {
        setFetchError(ratesRes.error);
      } else {
        setCrewRates(ratesRes.data?.items ?? []);
      }
      if (syncStatusRes.data) setSyncStatus(syncStatusRes.data);
      if (pendingRes.data) setPendingChanges(pendingRes.data);
      setLoading(false);
    })();
  }, []);

  const handleEdit = (rate: CrewRate) => {
    setEditingRate(rate);
    setFormData(rate);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingRate(null);
    setFormData({});
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingRate(null);
    setFormData({});
  };

  const handleSave = async () => {
    if (editingRate) {
      const payload: CrewRate = {
        ...editingRate,
        ...formData,
        updatedAt: new Date().toISOString(),
      } as CrewRate;
      const { data, error } = await adminApi.updateCrewRate(editingRate.id, payload);
      if (!error && data) {
        setCrewRates(crewRates.map(r => r.id === editingRate.id ? data : r));
      }
    } else {
      const payload: CrewRate = {
        ...formData,
        id: '',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      } as CrewRate;
      const { data, error } = await adminApi.createCrewRate(payload);
      if (!error && data) {
        setCrewRates([...crewRates, data]);
      }
    }
    handleClose();
  };

  const handleDelete = async (id: string) => {
    const { error } = await adminApi.deleteCrewRate(id);
    if (!error) {
      setCrewRates(crewRates.filter(r => r.id !== id));
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    const { error } = await adminApi.triggerCrewCostSync();
    setSyncing(false);
    if (!error) {
      const [statusRes, pendingRes] = await Promise.all([
        adminApi.getCrewCostSyncStatus(),
        adminApi.getCrewCostPendingChanges(),
      ]);
      if (statusRes.data) setSyncStatus(statusRes.data);
      if (pendingRes.data) setPendingChanges(pendingRes.data);
    }
  };

  const handleApproveChange = async (change: PendingChange) => {
    const { error } = await adminApi.approveCrewCostPendingChange(change.id);
    if (!error) {
      setPendingChanges(pendingChanges.filter(c => c.id !== change.id));
      const { data } = await adminApi.getCrewRates();
      if (data) setCrewRates(data.items);
    }
  };

  const handleRejectChange = async (change: PendingChange) => {
    const { error } = await adminApi.rejectCrewCostPendingChange(change.id);
    if (!error) {
      setPendingChanges(pendingChanges.filter(c => c.id !== change.id));
    }
  };

  const handleOpenSyncSettings = async () => {
    setSyncDialogOpen(true);
    setSyncSettingsLoading(true);
    const { data } = await adminApi.getCrewCostSyncSettings();
    if (data) {
      setSyncSettings(data);
      setSyncSettingsForm({ schedule: data.schedule ?? undefined, enabled: data.enabled });
    }
    setSyncSettingsLoading(false);
  };

  const handleSaveSyncSettings = async () => {
    const { data, error } = await adminApi.updateCrewCostSyncSettings(syncSettingsForm);
    if (!error && data) {
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 1 }}>
            Crew Costs & Union Rates
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Manage crew rates with AI powered quarterly auto sync from union agreements and industry surveys
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={handleOpenSyncSettings}
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
              fontWeight: 600,
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: 'rgba(212, 175, 55, 0.08)',
              },
            }}
          >
            Auto Sync Settings
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
            }}
          >
            Add Crew Rate
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

      {/* Legal Disclaimer */}
      <Alert
        severity="info"
        icon={<Info sx={{ color: '#42a5f5' }} />}
        sx={{
          mb: 4,
          bgcolor: 'rgba(66, 165, 245, 0.1)',
          border: '1px solid rgba(66, 165, 245, 0.3)',
          color: '#ffffff',
          '& .MuiAlert-message': {
            width: '100%',
          },
        }}
      >
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
          Informational Data Only Not Salary Advice
        </Typography>
        <Typography variant="body2" sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>
          All crew rate data shown here is sourced from publicly available union agreements, guild rate cards, and industry surveys.
          This information is provided for reference purposes only and does not constitute salary advice or negotiation guidance.
          Actual rates may vary based on experience, project budget, location, and individual negotiations.
          Always verify current rates with relevant unions, guilds, or industry sources before making hiring decisions.
        </Typography>
      </Alert>

      {/* AI Auto-Sync Status */}
      <Card sx={{ mb: 4, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
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
              startIcon={syncing ? <Refresh className="spin" /> : <Refresh />}
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
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => setShowPendingChanges(!showPendingChanges)}
              endIcon={showPendingChanges ? <ExpandLess /> : <ExpandMore />}
            >
              {showPendingChanges ? 'Hide' : 'Review'}
            </Button>
          }
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
              Pending Changes for Review
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

      <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Territory</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Role</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Category</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Day Rate</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Week Rate</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Union</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Source</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Last Updated</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {crewRates.map((rate) => {
                // Derive display values from new API fields, falling back to legacy fields
                const displayTerritory = rate.country
                  ? `${rate.country}${rate.region ? ` / ${rate.region}` : ''}`
                  : (rate.territory ?? 'N/A');
                const displayCategory = rate.roleCategory ?? rate.category ?? 'N/A';
                const displayUnion = rate.rateCurrency
                  ? `${rate.rateCurrency} · ${rate.department}`
                  : (rate.union ?? 'N/A');
                const displaySource = rate.sourceName ?? rate.source ?? 'N/A';
                const displayLastUpdated = rate.updatedAt
                  ? formatDate(rate.updatedAt)
                  : formatDate(rate.lastUpdated);
                const currency = rate.rateCurrency ?? 'USD';

                // Day rate: prefer unionRateCents (new) over dayRate (legacy, already in dollars)
                const dayRateDisplay = rate.unionRateCents != null
                  ? `${formatRate(rate.unionRateCents, currency)} to ${formatRate(rate.nonUnionRateCents, currency)}`
                  : rate.dayRate != null
                  ? `$${rate.dayRate}`
                  : 'N/A';

                // Week rate: legacy field only (new API is day-based)
                const weekRateDisplay = rate.weekRate != null ? `$${rate.weekRate}` : 'N/A';

                return (
                  <TableRow key={rate.id} sx={{ '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}>
                    <TableCell sx={{ color: '#ffffff' }}>{displayTerritory}</TableCell>
                    <TableCell sx={{ color: '#ffffff' }}>{rate.role}</TableCell>
                    <TableCell>
                      <Chip
                        label={displayCategory}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(212, 175, 55, 0.2)',
                          color: '#D4AF37',
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: '#ffffff', whiteSpace: 'nowrap' }}>{dayRateDisplay}</TableCell>
                    <TableCell sx={{ color: '#ffffff' }}>{weekRateDisplay}</TableCell>
                    <TableCell sx={{ color: '#a0a0a0', fontSize: '0.8rem' }}>{displayUnion}</TableCell>
                    <TableCell sx={{ color: '#a0a0a0', fontSize: '0.8rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displaySource}</TableCell>
                    <TableCell sx={{ color: '#a0a0a0', fontSize: '0.875rem' }}>{displayLastUpdated}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => handleEdit(rate)}>
                          <Edit sx={{ color: '#D4AF37', fontSize: 18 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => handleDelete(rate.id)}>
                          <Delete sx={{ color: '#f44336', fontSize: 18 }} />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Edit/Add Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          }
        }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 600 }}>
          {editingRate ? 'Edit Crew Rate' : 'Add Crew Rate'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
            <TextField
              label="Country (e.g. US, CA, GB)"
              value={formData.country || ''}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              fullWidth
            />
            <TextField
              label="Region (optional)"
              value={formData.region || ''}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              fullWidth
            />
            <TextField
              label="Role"
              value={formData.role || ''}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              fullWidth
            />
            <TextField
              label="Role Category (e.g. HOD Camera)"
              value={formData.roleCategory || ''}
              onChange={(e) => setFormData({ ...formData, roleCategory: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Department / Rate Type"
              value={formData.department || 'day'}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              fullWidth
            >
              {['day', 'week', 'session'].map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="Rate Currency (e.g. USD, CAD, GBP)"
              value={formData.rateCurrency || 'USD'}
              onChange={(e) => setFormData({ ...formData, rateCurrency: e.target.value })}
              fullWidth
            />
            <TextField
              label="Union Rate (cents, e.g. 120000 = $1,200)"
              type="number"
              value={formData.unionRateCents ?? ''}
              onChange={(e) => setFormData({ ...formData, unionRateCents: parseInt(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Non Union Rate (cents)"
              type="number"
              value={formData.nonUnionRateCents ?? ''}
              onChange={(e) => setFormData({ ...formData, nonUnionRateCents: parseInt(e.target.value) })}
              fullWidth
            />
            <TextField
              label="Source Name"
              value={formData.sourceName || ''}
              onChange={(e) => setFormData({ ...formData, sourceName: e.target.value })}
              fullWidth
            />
            <TextField
              label="Source URL"
              value={formData.sourceUrl || ''}
              onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
              fullWidth
            />
            <TextField
              label="Notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              minRows={2}
              sx={{ gridColumn: '1 / -1' }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button onClick={handleClose} sx={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              '&:hover': { bgcolor: '#D4AF37' },
            }}
          >
            {editingRate ? 'Update' : 'Add'} Rate
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
                <strong>How it works:</strong> Our AI agent reads union rate cards and industry surveys,
                extracts crew cost data, and flags changes for your review before auto applying.
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
                  onChange={(e) => setSyncSettingsForm({ ...syncSettingsForm, schedule: e.target.value as SyncSettingsUpdate['schedule'] })}
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
    </Box>
  );
}
