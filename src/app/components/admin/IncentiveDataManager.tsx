import { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  IconButton,
  Collapse,
  Link,
  MenuItem,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Edit,
  Delete,
  Add,
  Sync,
  Schedule,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  OpenInNew,
  Refresh,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { IncentiveData, IncentiveCalcResult, PendingChange, SyncStatus, SyncSettings, SyncSettingsUpdate } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

export function IncentiveDataManager(props?: any) {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canEditIncentiveData')) {
    return (
      <AdminAccessDenied
        requiredPermission="Edit Incentive Data"
        requiredRole="Master Admin, Senior Admin, or Data Admin"
      />
    );
  }

  return <IncentiveDataManagerContent {...props} />;
}


// ── v4 parity helpers ────────────────────────────────────────────────────────

const REGION_COLOURS: Record<string, string> = {
  UK: '#D4AF37',
  Europe: '#4f83cc',
  'North America': '#7e57c2',
  North: '#7e57c2',
  Africa: '#e07b39',
  Asia: '#26a69a',
  Oceania: '#66bb6a',
  'South America': '#ef5350',
  South: '#ef5350',
};

function regionColour(region?: string | null): string {
  return REGION_COLOURS[region || ''] || '#555';
}

function statusChipProps(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { label: 'Active', bg: 'rgba(46,125,50,0.2)', fg: '#66bb6a' };
  if (s === 'suspended') return { label: 'Suspended', bg: 'rgba(244,67,54,0.2)', fg: '#f44336' };
  if (s === 'no_programme') return { label: 'No Programme', bg: 'rgba(117,117,117,0.25)', fg: '#bdbdbd' };
  if (s === 'admin_verify_required') return { label: 'Verify Required', bg: 'rgba(255,152,0,0.2)', fg: '#ffa726' };
  return { label: status || 'Unknown', bg: 'rgba(117,117,117,0.2)', fg: '#9e9e9e' };
}

function verificationChipProps(v?: string | null) {
  const s = (v || '').toLowerCase();
  if (s.startsWith('verified')) return { label: v || 'Verified', bg: 'rgba(212,175,55,0.18)', fg: '#D4AF37' };
  if (s.startsWith('verify')) return { label: 'Needs Verify', bg: 'rgba(255,152,0,0.2)', fg: '#ffa726' };
  if (s.startsWith('inherited')) return { label: v || 'Inherited', bg: 'rgba(117,117,117,0.25)', fg: '#bdbdbd' };
  return { label: v || '—', bg: 'rgba(117,117,117,0.15)', fg: '#9e9e9e' };
}

function confidenceColour(c?: number | null): string {
  if (c == null) return '#555';
  if (c >= 85) return '#66bb6a';
  if (c >= 60) return '#D4AF37';
  return '#f44336';
}

function parseWarnings(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [raw];
  }
}

const CALC_CURRENCIES = ['GBP', 'USD', 'EUR', 'ZAR', 'CAD', 'AUD', 'HUF', 'CZK', 'NGN'];

// ── Qualifying Spend Calculator — ALL maths runs server-side
//    (ReportValidator._compute_corrected_rebate via /api/admin/incentives/calculate)
function QualifyingSpendCalculator({ incentives }: { incentives: IncentiveData[] }) {
  const [budget, setBudget] = useState('30000000');
  const [currency, setCurrency] = useState('GBP');
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<IncentiveCalcResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const options = incentives
    .map((i) => ({ key: `${i.territory}|||${i.program}`, label: `${i.territory} — ${i.program}` }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const handleCalculate = async () => {
    if (!selected) return;
    const [territory, program] = selected.split('|||');
    setCalculating(true);
    setCalcError(null);
    setResult(null);
    const { data, error } = await adminApi.calculateIncentive({
      budgetAmount: Number(budget) || 0,
      budgetCurrency: currency,
      territory,
      program,
    });
    setCalculating(false);
    if (error || !data) { setCalcError(error || 'Calculation failed'); return; }
    setResult(data);
  };

  return (
    <Paper sx={{ mb: 3, p: 2.5, bgcolor: '#0a0a0a', border: '1px solid #D4AF37' }}>
      <Typography variant="subtitle1" sx={{ color: '#D4AF37', fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>
        QUALIFYING SPEND CALCULATOR — RESOLVES WHAT A PRODUCTION CAN ACTUALLY CLAIM
      </Typography>
      <Typography variant="caption" sx={{ color: '#777', display: 'block', mb: 2 }}>
        Computed server-side by the report engine (single source of truth) — approximate illustrative FX for non-GBP budgets.
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          label="Budget" size="small" value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/[^0-9.]/g, ''))}
          sx={{ flex: '1 1 130px', minWidth: 120, maxWidth: { sm: 180 } }}
        />
        <TextField select label="Currency" size="small" value={currency} onChange={(e) => setCurrency(e.target.value)} sx={{ flex: '0 1 110px', minWidth: 96 }}>
          {CALC_CURRENCIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField select label="Territory — Programme" size="small" value={selected} onChange={(e) => setSelected(e.target.value)} sx={{ flex: '1 1 100%', minWidth: 0, width: { xs: '100%', md: 'auto' }, order: { xs: 3, md: 0 } }}>
          {options.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
        </TextField>
        <Button
          variant="contained" onClick={handleCalculate} disabled={calculating || !selected}
          sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#B8941F' }, order: { xs: 4, md: 0 }, flexShrink: 0 }}
        >
          {calculating ? 'Calculating…' : 'Calculate'}
        </Button>
      </Box>

      {calcError && <Alert severity="error" sx={{ mt: 2 }}>{calcError}</Alert>}

      {result && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.3)', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 700 }}>
            {result.territory} — {result.program}
            {result.mechanismPattern && <Chip size="small" label={`Pattern ${result.mechanismPattern}`} sx={{ ml: 1, bgcolor: '#1a1a1a', color: '#a0a0a0' }} />}
          </Typography>
          {result.refusalReason && (
            <Typography variant="body2" sx={{ color: '#f44336', fontWeight: 600, mt: 1 }}>
              {result.refusalReason}
            </Typography>
          )}
          {result.available === false && !result.switchedProgramme ? null : (
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mt: 1.5 }}>
              {[
                ['Budget', result.budget],
                [`Qualifying spend (${result.qualifyingSpendPct || '—'})`, result.qualifyingSpend],
                ['Gross rebate', result.grossRebate],
                ['Net rebate', result.netRebate],
                ['Net budget', result.netBudget],
              ].filter(([, v]) => v).map(([k, v]) => (
                <Box key={String(k)}>
                  <Typography variant="caption" sx={{ color: '#777', textTransform: 'uppercase', letterSpacing: 1 }}>{k}</Typography>
                  <Typography variant="h6" sx={{ color: k === 'Net rebate' ? '#D4AF37' : '#fff', fontWeight: 700 }}>{v}</Typography>
                </Box>
              ))}
            </Box>
          )}
          {(result.rateGrossDisplay || result.rateNetDisplay) && (
            <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', mt: 1 }}>
              Rate: {result.rateGrossDisplay || '—'} gross{result.rateNetDisplay ? ` · ${result.rateNetDisplay} net` : ''}
            </Typography>
          )}
          {(result.notes || []).map((n, i) => (
            <Typography key={i} variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5 }}>• {n}</Typography>
          ))}
          {result.fxNote && <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 0.5 }}>{result.fxNote}</Typography>}
        </Box>
      )}
    </Paper>
  );
}

function IncentiveDataManagerContent(_props?: any) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showPendingChanges, setShowPendingChanges] = useState(false);

  const [incentives, setIncentives] = useState<IncentiveData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editingIncentive, setEditingIncentive] = useState<IncentiveData | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<IncentiveData>>({});

  const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [syncSettings, setSyncSettings] = useState<SyncSettings | null>(null);
  const [syncSettingsForm, setSyncSettingsForm] = useState<SyncSettingsUpdate>({});
  const [syncSettingsLoading, setSyncSettingsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [regionFilter, setRegionFilter] = useState('all');
  const [verifFilter, setVerifFilter] = useState('all');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);


  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    (async () => {
      const [incentivesRes, syncStatusRes, pendingRes] = await Promise.all([
        adminApi.getIncentives(500, 0),
        adminApi.getIncentiveSyncStatus(),
        adminApi.getIncentivePendingChanges(),
      ]);
      if (incentivesRes.error) {
        setFetchError(incentivesRes.error);
      } else {
        setIncentives(incentivesRes.data?.items ?? []);
      }
      if (syncStatusRes.data) setSyncStatus(syncStatusRes.data);
      if (pendingRes.data) setPendingChanges(pendingRes.data);
      setLoading(false);
    })();
  }, []);

  const handleAutoSync = async () => {
    setSyncing(true);
    const { data, error } = await adminApi.triggerIncentiveSync();
    setSyncing(false);
    if (!error && data) {
      // Refresh sync status and pending changes after sync
      const [statusRes, pendingRes] = await Promise.all([
        adminApi.getIncentiveSyncStatus(),
        adminApi.getIncentivePendingChanges(),
      ]);
      if (statusRes.data) setSyncStatus(statusRes.data);
      if (pendingRes.data) setPendingChanges(pendingRes.data);
    }
  };

  const handleApproveChange = async (change: PendingChange) => {
    const { error } = await adminApi.approveIncentivePendingChange(change.id);
    if (!error) {
      setPendingChanges(pendingChanges.filter(c => c.id !== change.id));
      // Refresh incentives since the approved change updates the underlying record
      const { data } = await adminApi.getIncentives(500, 0);
      if (data) setIncentives(data.items);
    }
  };

  const handleRejectChange = async (change: PendingChange) => {
    const { error } = await adminApi.rejectIncentivePendingChange(change.id);
    if (!error) {
      setPendingChanges(pendingChanges.filter(c => c.id !== change.id));
    }
  };

  const handleDeleteIncentive = async (id: string) => {
    const { error } = await adminApi.deleteIncentive(id);
    if (!error) {
      setIncentives(incentives.filter(i => i.id !== id));
    }
  };

  const handleSaveIncentive = async () => {
    if (editingIncentive?.id) {
      const { data, error } = await adminApi.updateIncentive(
        editingIncentive.id,
        { ...editingIncentive, ...editFormData } as IncentiveData,
      );
      if (!error && data) {
        setIncentives(incentives.map(i => i.id === editingIncentive.id ? data : i));
      }
    } else {
      const { data, error } = await adminApi.createIncentive(editFormData as IncentiveData);
      if (!error && data) {
        setIncentives([...incentives, data]);
      }
    }
    setEditDialogOpen(false);
    setEditingIncentive(null);
    setEditFormData({});
  };

  const handleOpenSyncSettings = async () => {
    setSyncDialogOpen(true);
    setSyncSettingsLoading(true);
    const { data } = await adminApi.getIncentiveSyncSettings();
    if (data) {
      setSyncSettings(data);
      setSyncSettingsForm({ schedule: data.schedule ?? undefined, enabled: data.enabled });
    }
    setSyncSettingsLoading(false);
  };

  const handleSaveSyncSettings = async () => {
    const { data, error } = await adminApi.updateIncentiveSyncSettings(syncSettingsForm);
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
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 1 }}>
            Incentive Data Management
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Manage tax incentive data with AI powered quarterly auto sync from official sources
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Schedule />}
            onClick={handleOpenSyncSettings}
            sx={{
              borderColor: '#D4AF37',
              color: '#D4AF37',
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
            onClick={() => setEditDialogOpen(true)}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              },
            }}
          >
            Add Territory
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

      {/* v4 Stat Header */}
      {!loading && incentives.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            ['Programmes', incentives.length, '#D4AF37'],
            ['Active', incentives.filter((i) => (i.status || '').toLowerCase() === 'active').length, '#66bb6a'],
            ['Verified Jul 2026', incentives.filter((i) => (i.verificationStatus || '').toLowerCase().startsWith('verified')).length, '#D4AF37'],
            ['Needs Verification', incentives.filter((i) => (i.verificationStatus || '').toLowerCase().startsWith('verify')).length, '#ffa726'],
            ['Annual Pool Caps', incentives.filter((i) => !!i.annualProgrammeCap).length, '#4f83cc'],
            ['Territories', new Set(incentives.map((i) => i.territory)).size, '#a0a0a0'],
          ].map(([label, value, colour]) => (
            <Grid size={{ xs: 6, md: 2 }} key={String(label)}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.15)' }}>
                <Typography variant="h5" sx={{ color: String(colour), fontWeight: 800 }}>{String(value)}</Typography>
                <Typography variant="caption" sx={{ color: '#777', textTransform: 'uppercase', letterSpacing: 0.8 }}>{String(label)}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Qualifying Spend Calculator — server-side maths */}
      {!loading && incentives.length > 0 && <QualifyingSpendCalculator incentives={incentives} />}

      {/* Search + Filters */}
      {!loading && incentives.length > 0 && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
          <TextField
            size="small" placeholder="Search territory, programme…" value={search}
            onChange={(e) => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 240 }}
          />
          <TextField select size="small" label="Region" value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)} sx={{ flex: '1 1 140px', minWidth: 130 }}>
            <MenuItem value="all">All regions</MenuItem>
            {[...new Set(incentives.map((i) => i.region).filter(Boolean))].sort().map((r) => (
              <MenuItem key={String(r)} value={String(r)}>{String(r)}</MenuItem>
            ))}
          </TextField>
          <TextField select size="small" label="Verification" value={verifFilter} onChange={(e) => setVerifFilter(e.target.value)} sx={{ flex: '1 1 170px', minWidth: 150 }}>
            <MenuItem value="all">All verification statuses</MenuItem>
            {[...new Set(incentives.map((i) => i.verificationStatus).filter(Boolean))].sort().map((v) => (
              <MenuItem key={String(v)} value={String(v)}>{String(v)}</MenuItem>
            ))}
          </TextField>
        </Box>
      )}

      {/* Auto-Sync Status Card */}
      <Card sx={{ mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Sync sx={{ color: '#D4AF37', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 600 }}>
                  AI Powered Auto Sync Status
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                  Next scheduled check: <strong>{formatDate(syncStatus?.nextScheduledCheck)}</strong>
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained"
              startIcon={syncing ? <Refresh className="spin" /> : <Refresh />}
              onClick={handleAutoSync}
              disabled={syncing}
              sx={{
                bgcolor: '#D4AF37',
                color: '#000000',
                '&:hover': { bgcolor: '#D4AF37' },
              }}
            >
              {syncing ? 'Syncing...' : 'Run Sync Now'}
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(46, 125, 50, 0.1)', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ color: '#66bb6a', fontWeight: 700 }}>
                  {syncStatus?.territoriesSyncing ?? 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                  Territories Auto Syncing
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ color: '#ffa726', fontWeight: 700 }}>
                  {pendingChanges.length}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                  Pending Changes
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(212, 175, 55, 0.1)', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ color: '#D4AF37', fontWeight: 700 }}>
                  {syncStatus?.daysSinceLastCheck ?? 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
                  Days Since Last Check
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Pending Changes Alert */}
      {pendingChanges.length > 0 && (
        <Alert
          severity="warning"
          sx={{
            mb: 3,
            bgcolor: 'rgba(255, 152, 0, 0.1)',
            color: '#ffa726',
            border: '1px solid rgba(255, 152, 0, 0.3)',
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
          <strong>{pendingChanges.length} change(s) detected</strong> by AI auto sync and awaiting your review
        </Alert>
      )}

      {/* Pending Changes Section */}
      <Collapse in={showPendingChanges}>
        <Paper sx={{ mb: 3, bgcolor: '#0a0a0a', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
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

      {/* Incentives Table — v4 parity */}
      <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', maxWidth: '100%' }}>
        <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
          <Table size="small" sx={{ minWidth: 1180 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1, position: 'sticky', left: 0, zIndex: 3, bgcolor: '#0a0a0a' }}>Territory</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Programme</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Rate</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Per-Project Cap</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Annual Pool</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Mechanism</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Status</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Verification</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Confidence</TableCell>
                <TableCell sx={{ color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {incentives
                .filter((i) => {
                  const q = search.trim().toLowerCase();
                  if (q && !`${i.territory} ${i.program}`.toLowerCase().includes(q)) return false;
                  if (regionFilter !== 'all' && i.region !== regionFilter) return false;
                  if (verifFilter !== 'all' && i.verificationStatus !== verifFilter) return false;
                  return true;
                })
                .flatMap((incentive, index) => {
                  const rowId = incentive.id || `${incentive.territory}-${incentive.program}-${index}`;
                  const expanded = expandedRowId === rowId;
                  const status = statusChipProps(incentive.status);
                  const verif = verificationChipProps(incentive.verificationStatus);
                  const warnings = parseWarnings(incentive.warningsJson);
                  const rows = [
                    <TableRow
                      key={rowId}
                      onClick={() => setExpandedRowId(expanded ? null : rowId)}
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.05)' } }}
                    >
                      <TableCell sx={{ color: '#fff', borderLeft: `3px solid ${regionColour(incentive.region)}`, position: 'sticky', left: 0, zIndex: 2, bgcolor: '#0a0a0a', minWidth: 130 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{incentive.territory}</Typography>
                        <Typography variant="caption" sx={{ color: '#777' }}>{incentive.region || ''}</Typography>
                      </TableCell>
                      <TableCell sx={{ color: '#fff', maxWidth: 260 }}>
                        <Typography variant="body2">{incentive.program}</Typography>
                        {incentive.rateType && (
                          <Typography variant="caption" sx={{ color: '#666' }}>{incentive.rateType}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#D4AF37', fontWeight: 700 }}>
                          {incentive.rateGrossDisplay || incentive.rate || '—'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>
                          gross{incentive.rateNetDisplay ? ` · net ${incentive.rateNetDisplay}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 190 }}>
                        <Typography variant="body2" sx={{ color: '#fff' }}>{incentive.rebateCapDisplay || incentive.cap || '—'}</Typography>
                        {incentive.qsBasis && (
                          <Tooltip title={incentive.qsBasis}>
                            <Typography variant="caption" sx={{ color: '#666', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              QS: {incentive.qsBasis}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 170 }}>
                        {incentive.annualProgrammeCap ? (
                          <Tooltip title={incentive.annualProgrammeCap}>
                            <Typography variant="caption" sx={{ color: '#a0a0a0', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {incentive.annualProgrammeCap}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#555' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={incentive.mechanismPattern ? `Pattern ${incentive.mechanismPattern}` : '—'} sx={{ bgcolor: '#161616', color: '#a0a0a0', fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={status.label} sx={{ bgcolor: status.bg, color: status.fg, fontWeight: 700, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={verif.label} sx={{ bgcolor: verif.bg, color: verif.fg, fontWeight: 600, fontSize: '0.7rem' }} />
                      </TableCell>
                      <TableCell sx={{ minWidth: 110 }}>
                        {incentive.confidence != null ? (
                          <Box>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(100, incentive.confidence)}
                              sx={{ height: 6, borderRadius: 1, bgcolor: '#1a1a1a', '& .MuiLinearProgress-bar': { bgcolor: confidenceColour(incentive.confidence) } }}
                            />
                            <Typography variant="caption" sx={{ color: '#888' }}>{incentive.confidence}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#555' }}>—</Typography>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingIncentive(incentive);
                              setEditFormData(incentive);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit sx={{ color: '#D4AF37', fontSize: 18 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => incentive.id && handleDeleteIncentive(incentive.id)}
                          >
                            <Delete sx={{ color: '#f44336', fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>,
                  ];

                  if (expanded) {
                    rows.push(
                      <TableRow key={`${rowId}-detail`}>
                        <TableCell colSpan={10} sx={{ bgcolor: 'rgba(212,175,55,0.04)', borderBottom: '1px solid rgba(212,175,55,0.25)' }}>
                          <Box sx={{ position: 'sticky', left: 0, maxWidth: 'calc(100vw - 48px)' }}>
                          <Box sx={{ py: 1.5, px: 1 }}>
                            {incentive.calcFormula && (
                              <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 700, letterSpacing: 1 }}>CALC FORMULA</Typography>
                                <Typography variant="body2" sx={{ color: '#ccc', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>
                                  {incentive.calcFormula}
                                </Typography>
                              </Box>
                            )}
                            {warnings.length > 0 && (
                              <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" sx={{ color: '#ffa726', fontWeight: 700, letterSpacing: 1 }}>WARNINGS</Typography>
                                {warnings.map((w, wi) => (
                                  <Typography key={wi} variant="body2" sx={{ color: '#ccc', fontSize: '0.8rem' }}>⚠ {w}</Typography>
                                ))}
                              </Box>
                            )}
                            {incentive.aiRule && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ color: '#4f83cc', fontWeight: 700, letterSpacing: 1 }}>AI RULE</Typography>
                                <Typography variant="body2" sx={{ color: '#ccc', fontSize: '0.8rem' }}>{incentive.aiRule}</Typography>
                              </Box>
                            )}
                            {incentive.budgetEligibilityCeiling && (
                              <Typography variant="caption" sx={{ color: '#f44336', display: 'block' }}>
                                Eligibility ceiling: {incentive.budgetEligibilityCeiling}
                              </Typography>
                            )}
                            {incentive.sourceUrl && (
                              <Link href={incentive.sourceUrl} target="_blank" rel="noopener" sx={{ color: '#D4AF37', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                Official Source <OpenInNew sx={{ fontSize: 13 }} />
                              </Link>
                            )}
                          </Box>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return rows;
                })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Auto-Sync Settings Dialog */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        maxWidth="md"
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
                <strong>How it works:</strong> Our AI agent reads official government websites and PDFs quarterly,
                extracts tax incentive data, and flags changes for your review before auto applying.
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

              <Typography variant="subtitle1" sx={{ color: '#D4AF37', fontWeight: 600, mb: 2 }}>
                Monitored Official Sources:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {incentives.filter(i => i.autoSyncEnabled).map((incentive, index) => (
                  <Card key={index} sx={{ bgcolor: '#1a1a1a', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: '#ffffff', fontWeight: 600, mb: 1 }}>
                        {incentive.territory}
                      </Typography>
                      {incentive.sourceUrl && (
                        <Link
                          href={incentive.sourceUrl ?? undefined}
                          target="_blank"
                          sx={{
                            color: '#D4AF37',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            textDecoration: 'none',
                            '&:hover': { color: '#D4AF37' },
                          }}
                        >
                          {incentive.sourceUrl}
                          <OpenInNew sx={{ fontSize: 12 }} />
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Box sx={{ mt: 3 }}>
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

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingIncentive(null);
          setEditFormData({});
        }}
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
          {editingIncentive ? 'Edit Incentive Data' : 'Add Territory'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <TextField
              label="Territory"
              fullWidth
              value={editFormData.territory || ''}
              onChange={(e) => setEditFormData({ ...editFormData, territory: e.target.value })}
            />
            <TextField
              label="Program Name"
              fullWidth
              value={editFormData.program || ''}
              onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })}
            />
            <TextField
              label="Rate"
              fullWidth
              value={editFormData.rate || ''}
              onChange={(e) => setEditFormData({ ...editFormData, rate: e.target.value })}
            />
            <TextField
              label="Cap"
              fullWidth
              value={editFormData.cap || ''}
              onChange={(e) => setEditFormData({ ...editFormData, cap: e.target.value })}
            />
            <TextField
              label="Source URL"
              fullWidth
              value={editFormData.sourceUrl || ''}
              onChange={(e) => setEditFormData({ ...editFormData, sourceUrl: e.target.value })}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setEditingIncentive(null);
              setEditFormData({});
            }}
            sx={{ color: '#a0a0a0' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveIncentive}
            sx={{
              bgcolor: '#D4AF37',
              color: '#000000',
              '&:hover': { bgcolor: '#D4AF37' },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {syncing && (
        <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress
            sx={{
              bgcolor: 'rgba(212, 175, 55, 0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: '#D4AF37',
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
