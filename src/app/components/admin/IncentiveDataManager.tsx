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
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
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
import { getTerritories } from '@/services/api';
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
  UK: 'primary.main',
  Europe: 'info.main',
  'North America': '#7e57c2',
  North: '#7e57c2',
  Africa: '#e07b39',
  Asia: '#26a69a',
  Oceania: 'success.main',
  'South America': '#ef5350',
  South: '#ef5350',
};

function regionColour(region?: string | null): string {
  return REGION_COLOURS[region || ''] || '#555';
}

function statusChipProps(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { label: 'Active', bg: 'rgba(46,125,50,0.2)', fg: 'success.main' };
  if (s === 'suspended') return { label: 'Suspended', bg: 'rgba(244,67,54,0.2)', fg: 'error.main' };
  if (s === 'no_programme') return { label: 'No Programme', bg: 'rgba(117,117,117,0.25)', fg: '#bdbdbd' };
  if (s === 'admin_verify_required') return { label: 'Verify Required', bg: 'rgba(255,152,0,0.2)', fg: 'warning.main' };
  return { label: status || 'Unknown', bg: 'rgba(117,117,117,0.2)', fg: 'text.secondary' };
}

function verificationChipProps(v?: string | null) {
  const s = (v || '').toLowerCase();
  if (s.startsWith('verified')) return { label: v || 'Verified', bg: 'action.selected', fg: 'primary.main' };
  if (s.startsWith('verify')) return { label: 'Needs Verify', bg: 'rgba(255,152,0,0.2)', fg: 'warning.main' };
  if (s.startsWith('inherited')) return { label: v || 'Inherited', bg: 'rgba(117,117,117,0.25)', fg: '#bdbdbd' };
  return { label: v || ', ', bg: 'rgba(117,117,117,0.15)', fg: 'text.secondary' };
}

function confidenceColour(c?: number | null): string {
  if (c == null) return '#555';
  if (c >= 85) return 'success.main';
  if (c >= 60) return 'primary.main';
  return 'error.main';
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

// HONEST DEFAULTS for a newly created row, it must NEVER look verified.
// The admin has to explicitly promote status / verification / confidence.
const NEW_ROW_DEFAULTS: Partial<IncentiveData> = {
  status: 'admin_verify_required',
  verificationStatus: 'verify-required',
  confidence: 30,
};

const RATE_TYPES = ['cash_rebate', 'tax_credit', 'enhanced_tax_credit', 'refundable_tax_credit', 'transferable_tax_credit', 'labour_credit', 'grant', 'cash_grant', 'tax_shelter'];
const REGIONS = ['UK', 'Europe', 'North America', 'Africa', 'Asia', 'Oceania', 'South America'];
const QS_TYPES = ['total', 'local_spend', 'labour', 'pdv'];

// ── Qualifying Spend Calculator, ALL maths runs server-side
//    (ReportValidator._compute_corrected_rebate via /api/admin/incentives/calculate)
function QualifyingSpendCalculator({ incentives }: { incentives: IncentiveData[] }) {
  const [budget, setBudget] = useState('30000000');
  const [currency, setCurrency] = useState('GBP');
  const [selected, setSelected] = useState('');
  const [result, setResult] = useState<IncentiveCalcResult | null>(null);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calculating, setCalculating] = useState(false);

  const options = incentives
    .map((i) => ({ key: `${i.territory}|||${i.program}`, label: `${i.territory}, ${i.program}` }))
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
    <Paper sx={{ mb: 3, p: 2.5, bgcolor: 'background.paper', border: '1px solid #D4AF37' }}>
      <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1, mb: 0.5 }}>
        QUALIFYING SPEND CALCULATOR, RESOLVES WHAT A PRODUCTION CAN ACTUALLY CLAIM
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
        Computed server-side by the report engine (single source of truth), approximate illustrative FX for non-GBP budgets.
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
        <TextField select label="Territory, Programme" size="small" value={selected} onChange={(e) => setSelected(e.target.value)} sx={{ flex: '1 1 100%', minWidth: 0, width: { xs: '100%', md: 'auto' }, order: { xs: 3, md: 0 } }}>
          {options.map((o) => <MenuItem key={o.key} value={o.key}>{o.label}</MenuItem>)}
        </TextField>
        <Button
          variant="contained" onClick={handleCalculate} disabled={calculating || !selected}
          sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, '&:hover': { bgcolor: 'primary.dark' }, order: { xs: 4, md: 0 }, flexShrink: 0 }}
        >
          {calculating ? 'Calculating…' : 'Calculate'}
        </Button>
      </Box>

      {calcError && <Alert severity="error" sx={{ mt: 2 }}>{calcError}</Alert>}

      {result && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 700 }}>
            {result.territory}, {result.program}
            {result.mechanismPattern && <Chip size="small" label={`Pattern ${result.mechanismPattern}`} sx={{ ml: 1, bgcolor: 'background.paper', color: 'text.secondary' }} />}
          </Typography>
          {result.refusalReason && (
            <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600, mt: 1 }}>
              {result.refusalReason}
            </Typography>
          )}
          {result.available === false && !result.switchedProgramme ? null : (
            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap', mt: 1.5 }}>
              {[
                ['Budget', result.budget],
                [`Qualifying spend (${result.qualifyingSpendPct || ', '})`, result.qualifyingSpend],
                ['Gross rebate', result.grossRebate],
                ['Net rebate', result.netRebate],
                ['Net budget', result.netBudget],
              ].filter(([, v]) => v).map(([k, v]) => (
                <Box key={String(k)}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>{k}</Typography>
                  <Typography variant="h6" sx={{ color: k === 'Net rebate' ? 'primary.main' : '#fff', fontWeight: 700 }}>{v}</Typography>
                </Box>
              ))}
            </Box>
          )}
          {(result.rateGrossDisplay || result.rateNetDisplay) && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
              Rate: {result.rateGrossDisplay || ', '} gross{result.rateNetDisplay ? ` · ${result.rateNetDisplay} net` : ''}
            </Typography>
          )}
          {(result.notes || []).map((n, i) => (
            <Typography key={i} variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5 }}>• {n}</Typography>
          ))}
          {result.fxNote && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>{result.fxNote}</Typography>}
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
  const [territoryOptions, setTerritoryOptions] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [warningsText, setWarningsText] = useState('');
  const formFullScreen = useMediaQuery('(max-width:600px)');



  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    (async () => {
      getTerritories()
        .then((ts) => setTerritoryOptions(ts.map((t: any) => t.label)))
        .catch(() => setTerritoryOptions([]));
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
    // ── Validation ──
    const errors: string[] = [];
    if (!editFormData.territory) errors.push('Territory is required (canonical list).');
    else if (territoryOptions.length > 0 && !territoryOptions.includes(editFormData.territory)) {
      errors.push('Territory must be one of the canonical territories.');
    }
    if (!editFormData.program?.trim()) errors.push('Programme name is required.');
    if (!editFormData.sourceUrl?.trim()) errors.push('Source URL is required, no row without a source.');
    if (errors.length > 0) { setFormErrors(errors); return; }
    setFormErrors([]);

    // warnings: one per line → JSON array (verbatim, no derivation)
    const warningLines = warningsText.split('\n').map((w) => w.trim()).filter(Boolean);
    const payload: Partial<IncentiveData> = {
      ...editFormData,
      warningsJson: warningLines.length > 0 ? JSON.stringify(warningLines) : editFormData.warningsJson ?? null,
    };

    if (editingIncentive?.id) {
      const { data, error } = await adminApi.updateIncentive(
        editingIncentive.id,
        { ...editingIncentive, ...payload } as IncentiveData,
      );
      if (!error && data) {
        setIncentives(incentives.map(i => i.id === editingIncentive.id ? data : i));
      }
    } else {
      const { data, error } = await adminApi.createIncentive(payload as IncentiveData);
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
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Manage tax incentive data with AI powered quarterly auto sync from official sources
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Schedule />}
            onClick={handleOpenSyncSettings}
            sx={{
              borderColor: 'primary.main',
              color: 'primary.main',
              '&:hover': {
                borderColor: 'primary.main',
                bgcolor: 'action.hover',
              },
            }}
          >
            Auto Sync Settings
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => { setEditingIncentive(null); setEditFormData({ ...NEW_ROW_DEFAULTS }); setWarningsText(''); setFormErrors([]); setEditDialogOpen(true); }}
            sx={{
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'primary.main',
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
          <CircularProgress sx={{ color: 'primary.main' }} />
        </Box>
      )}

      {/* v4 Stat Header */}
      {!loading && incentives.length > 0 && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            ['Programmes', incentives.length, 'primary.main'],
            ['Active', incentives.filter((i) => (i.status || '').toLowerCase() === 'active').length, 'success.main'],
            ['Verified Jul 2026', incentives.filter((i) => (i.verificationStatus || '').toLowerCase().startsWith('verified')).length, 'primary.main'],
            ['Needs Verification', incentives.filter((i) => (i.verificationStatus || '').toLowerCase().startsWith('verify')).length, 'warning.main'],
            ['Annual Pool Caps', incentives.filter((i) => !!i.annualProgrammeCap).length, 'info.main'],
            ['Territories', new Set(incentives.map((i) => i.territory)).size, 'text.secondary'],
          ].map(([label, value, colour]) => (
            <Grid size={{ xs: 6, md: 2 }} key={String(label)}>
              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                <Typography variant="h5" sx={{ color: String(colour), fontWeight: 800 }}>{String(value)}</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>{String(label)}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Qualifying Spend Calculator, server-side maths */}
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
      <Card sx={{ mb: 3, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Sync sx={{ color: 'primary.main', fontSize: 28 }} />
              <Box>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  AI Powered Auto Sync Status
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '&:hover': { bgcolor: 'primary.main' },
              }}
            >
              {syncing ? 'Syncing...' : 'Run Sync Now'}
            </Button>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(46, 125, 50, 0.1)', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 700 }}>
                  {syncStatus?.territoriesSyncing ?? 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Territories Auto Syncing
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'rgba(255, 152, 0, 0.1)', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ color: 'warning.main', fontWeight: 700 }}>
                  {pendingChanges.length}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Pending Changes
                </Typography>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                  {syncStatus?.daysSinceLastCheck ?? 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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
            color: 'warning.main',
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
        <Paper sx={{ mb: 3, bgcolor: 'background.paper', border: '1px solid rgba(255, 152, 0, 0.3)' }}>
          <Box sx={{ p: 2, bgcolor: 'rgba(255, 152, 0, 0.05)' }}>
            <Typography variant="h6" sx={{ color: 'warning.main', fontWeight: 600 }}>
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
                      label={`${change.confidence.toUpperCase()} CONFIDENCE`}
                      size="small"
                      sx={{
                        bgcolor: change.confidence === 'high' ? 'rgba(46, 125, 50, 0.2)' : 'rgba(255, 152, 0, 0.2)',
                        color: change.confidence === 'high' ? 'success.main' : 'warning.main',
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

      {/* Incentives Table, v4 parity */}
      <Paper sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', maxWidth: '100%' }}>
        <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
          <Table size="small" sx={{ minWidth: 1180 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1, position: 'sticky', left: 0, zIndex: 3, bgcolor: 'background.paper' }}>Territory</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Programme</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Rate</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Per-Project Cap</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Annual Pool</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Mechanism</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Status</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Verification</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Confidence</TableCell>
                <TableCell sx={{ color: 'primary.main', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.72rem', letterSpacing: 1 }}>Actions</TableCell>
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
                      sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    >
                      <TableCell sx={{ color: 'text.primary', borderLeft: `3px solid ${regionColour(incentive.region)}`, position: 'sticky', left: 0, zIndex: 2, bgcolor: 'background.paper', minWidth: 130 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{incentive.territory}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{incentive.region || ''}</Typography>
                      </TableCell>
                      <TableCell sx={{ color: 'text.primary', maxWidth: 260 }}>
                        <Typography variant="body2">{incentive.program}</Typography>
                        {incentive.rateType && (
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{incentive.rateType}</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                          {incentive.rateGrossDisplay || incentive.rate || ', '}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#888' }}>
                          gross{incentive.rateNetDisplay ? ` · net ${incentive.rateNetDisplay}` : ''}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ maxWidth: 190 }}>
                        <Typography variant="body2" sx={{ color: 'text.primary' }}>{incentive.rebateCapDisplay || incentive.cap || ', '}</Typography>
                        {incentive.qsBasis && (
                          <Tooltip title={incentive.qsBasis}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              QS: {incentive.qsBasis}
                            </Typography>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell sx={{ maxWidth: 170 }}>
                        {incentive.annualProgrammeCap ? (
                          <Tooltip title={incentive.annualProgrammeCap}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {incentive.annualProgrammeCap}
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#555' }}>, </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip size="small" label={incentive.mechanismPattern ? `Pattern ${incentive.mechanismPattern}` : ', '} sx={{ bgcolor: 'background.paper', color: 'text.secondary', fontSize: '0.7rem' }} />
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
                              sx={{ height: 6, borderRadius: 1, bgcolor: 'background.paper', '& .MuiLinearProgress-bar': { bgcolor: confidenceColour(incentive.confidence) } }}
                            />
                            <Typography variant="caption" sx={{ color: '#888' }}>{incentive.confidence}</Typography>
                          </Box>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#555' }}>, </Typography>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditingIncentive(incentive);
                              setEditFormData(incentive);
                              setWarningsText(parseWarnings(incentive.warningsJson).join('\n'));
                              setFormErrors([]);
                              setEditDialogOpen(true);
                            }}
                          >
                            <Edit sx={{ color: 'primary.main', fontSize: 18 }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => incentive.id && handleDeleteIncentive(incentive.id)}
                          >
                            <Delete sx={{ color: 'error.main', fontSize: 18 }} />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>,
                  ];

                  if (expanded) {
                    rows.push(
                      <TableRow key={`${rowId}-detail`}>
                        <TableCell colSpan={10} sx={{ bgcolor: 'action.hover', borderBottom: '1px solid' }}>
                          <Box sx={{ position: 'sticky', left: 0, maxWidth: 'calc(100vw - 48px)' }}>
                          <Box sx={{ py: 1.5, px: 1 }}>
                            {incentive.calcFormula && (
                              <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: 1 }}>CALC FORMULA</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.78rem', whiteSpace: 'pre-wrap' }}>
                                  {incentive.calcFormula}
                                </Typography>
                              </Box>
                            )}
                            {warnings.length > 0 && (
                              <Box sx={{ mb: 1.5 }}>
                                <Typography variant="caption" sx={{ color: 'warning.main', fontWeight: 700, letterSpacing: 1 }}>WARNINGS</Typography>
                                {warnings.map((w, wi) => (
                                  <Typography key={wi} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>⚠ {w}</Typography>
                                ))}
                              </Box>
                            )}
                            {incentive.aiRule && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 700, letterSpacing: 1 }}>AI RULE</Typography>
                                <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{incentive.aiRule}</Typography>
                              </Box>
                            )}
                            {incentive.budgetEligibilityCeiling && (
                              <Typography variant="caption" sx={{ color: 'error.main', display: 'block' }}>
                                Eligibility ceiling: {incentive.budgetEligibilityCeiling}
                              </Typography>
                            )}
                            {incentive.sourceUrl && (
                              <Link href={incentive.sourceUrl} target="_blank" rel="noopener" sx={{ color: 'primary.main', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
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
                <strong>How it works:</strong> Our AI agent reads official government websites and PDFs quarterly,
                extracts tax incentive data, and flags changes for your review before auto applying.
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

              <Typography variant="subtitle1" sx={{ color: 'primary.main', fontWeight: 600, mb: 2 }}>
                Monitored Official Sources:
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {incentives.filter(i => i.autoSyncEnabled).map((incentive, index) => (
                  <Card key={index} sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                    <CardContent>
                      <Typography variant="subtitle2" sx={{ color: 'text.primary', fontWeight: 600, mb: 1 }}>
                        {incentive.territory}
                      </Typography>
                      {incentive.sourceUrl && (
                        <Link
                          href={incentive.sourceUrl ?? undefined}
                          target="_blank"
                          sx={{
                            color: 'primary.main',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            textDecoration: 'none',
                            '&:hover': { color: 'primary.main' },
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
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1 }}>
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

      {/* Add / Edit Dialog, full schema coverage, honest defaults */}
      <Dialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingIncentive(null);
          setEditFormData({});
          setFormErrors([]);
        }}
        maxWidth="md"
        fullWidth
        fullScreen={formFullScreen}
        PaperProps={{ sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 600 }}>
          {editingIncentive ? 'Edit Incentive Programme' : 'Add Incentive Programme'}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {formErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErrors.map((e, i) => <div key={i}>{e}</div>)}
            </Alert>
          )}
          {!editingIncentive && (
            <Alert severity="info" sx={{ mb: 2, bgcolor: 'action.hover', color: 'primary.main' }}>
              New rows default to status "Verify Required", verification "verify-required" and confidence 30,
              they are excluded from report scoring until an admin explicitly promotes them.
            </Alert>
          )}
          {!editFormData.calcFormula?.trim() && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              calc_formula is empty, the Qualifying Spend Calculator cannot compute this row. Saving is allowed.
            </Alert>
          )}

          {/* ── Identity ── */}
          <Accordion defaultExpanded sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
              <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>Identity</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField select required fullWidth size="small" label="Territory (canonical)"
                    value={editFormData.territory || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, territory: e.target.value })}>
                    {territoryOptions.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField required fullWidth size="small" label="Programme name"
                    value={editFormData.program || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, program: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth size="small" label="Region"
                    value={editFormData.region || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, region: e.target.value })}>
                    {REGIONS.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth size="small" label="Rate type"
                    value={editFormData.rateType || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, rateType: e.target.value })}>
                    {RATE_TYPES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth size="small" label="Status"
                    value={editFormData.status || 'admin_verify_required'}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                    <MenuItem value="no_programme">No Programme</MenuItem>
                    <MenuItem value="admin_verify_required">Verify Required</MenuItem>
                  </TextField>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* ── Rates ── */}
          <Accordion sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
              <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>Rates</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Rate gross, display string"
                    helperText={'Verbatim (\u201cup to 35%\u201d, tiered, \u201cNone\u201d), never derived from the numeric'}
                    value={editFormData.rateGrossDisplay || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, rateGrossDisplay: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Rate net, display string"
                    helperText="Verbatim, never derived"
                    value={editFormData.rateNetDisplay || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, rateNetDisplay: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="Rate gross % (numeric)" type="number"
                    value={editFormData.rateGross ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, rateGross: e.target.value === '' ? null : Number(e.target.value) })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="Rate net % (numeric)" type="number"
                    value={editFormData.rateNet ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, rateNet: e.target.value === '' ? null : Number(e.target.value) })} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* ── Qualifying spend ── */}
          <Accordion sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
              <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>Qualifying spend</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField select fullWidth size="small" label="QS type"
                    value={editFormData.qualifyingSpendType || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, qualifyingSpendType: e.target.value })}>
                    {QS_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="QS cap %" type="number"
                    value={editFormData.qualifyingSpendCapPct ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, qualifyingSpendCapPct: e.target.value === '' ? null : Number(e.target.value) })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="QS minimum (amount)" type="number"
                    value={editFormData.qualifyingSpendMin ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, qualifyingSpendMin: e.target.value === '' ? null : Number(e.target.value) })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="QS min currency"
                    value={editFormData.qualifyingSpendCurrency || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, qualifyingSpendCurrency: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={2} label="QS basis (prose)"
                    value={editFormData.qsBasis || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, qsBasis: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={<Checkbox checked={editFormData.atl_exempt === true}
                      indeterminate={editFormData.atl_exempt == null}
                      onChange={(e) => setEditFormData({ ...editFormData, atl_exempt: e.target.checked })}
                      sx={{ color: 'primary.main' }} />}
                    label="ATL costs included in qualifying spend (atl_exempt)" />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* ── Caps & ceilings ── */}
          <Accordion sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
              <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>Caps &amp; ceilings</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Per-project cap (display string)"
                    value={editFormData.rebateCapDisplay || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, rebateCapDisplay: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField fullWidth size="small" label="Per-person cap (display string)"
                    value={editFormData.perPersonCapDisplay || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, perPersonCapDisplay: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField select fullWidth size="small" label="Cap type"
                    value={editFormData.capType || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, capType: e.target.value })}>
                    <MenuItem value="output">output (rebate ceiling)</MenuItem>
                    <MenuItem value="qualifying_spend">qualifying_spend (spend ceiling)</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={2} label="Annual programme cap / pool"
                    value={editFormData.annualProgrammeCap || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, annualProgrammeCap: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={2} label="Budget eligibility ceiling"
                    value={editFormData.budgetEligibilityCeiling || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, budgetEligibilityCeiling: e.target.value })} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* ── Engine ── */}
          <Accordion sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
              <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>Engine</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField select fullWidth size="small" label="Mechanism pattern"
                    value={editFormData.mechanismPattern || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, mechanismPattern: e.target.value })}>
                    <MenuItem value="A">A</MenuItem>
                    <MenuItem value="B">B</MenuItem>
                    <MenuItem value="C">C</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={3} label="Calc formula"
                    helperText="The calculator cannot compute this row without it"
                    value={editFormData.calcFormula || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, calcFormula: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControlLabel
                    control={<Checkbox checked={editFormData.is_supplementary === true}
                      onChange={(e) => setEditFormData({ ...editFormData, is_supplementary: e.target.checked })}
                      sx={{ color: 'primary.main' }} />}
                    label="Supplementary credit (spend-subset uplift, never a full-budget alternative)" />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* ── Payment ── */}
          <Accordion sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
              <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>Payment</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="Payment reliability (0–1)" type="number"
                    inputProps={{ step: 0.01, min: 0, max: 1 }}
                    value={editFormData.payment_reliability ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, payment_reliability: e.target.value === '' ? null : Number(e.target.value) })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 9 }}>
                  <TextField fullWidth size="small" label="Payment timeline (display string)"
                    value={editFormData.paymentTimeline || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, paymentTimeline: e.target.value })} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* ── Governance ── */}
          <Accordion defaultExpanded sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'primary.main' }} />}>
              <Typography sx={{ color: 'primary.main', fontWeight: 700 }}>Governance &amp; verification</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField required fullWidth size="small" label="Source URL"
                    helperText="Required, no row without a source"
                    value={editFormData.sourceUrl || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, sourceUrl: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select fullWidth size="small" label="Authority"
                    value={editFormData.authority || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, authority: e.target.value })}>
                    <MenuItem value="government">government</MenuItem>
                    <MenuItem value="government_agency">government_agency</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField fullWidth size="small" label="Last verified (YYYY-MM-DD)"
                    value={editFormData.lastVerifiedAt || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, lastVerifiedAt: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField fullWidth size="small" label="Verification status"
                    helperText={editingIncentive ? undefined : 'Defaults to verify-required'}
                    value={editFormData.verificationStatus || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, verificationStatus: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                  <TextField fullWidth size="small" label="Confidence (0–100)" type="number"
                    inputProps={{ min: 0, max: 100 }}
                    helperText={editingIncentive ? undefined : 'Defaults to 30, set explicitly'}
                    value={editFormData.confidence ?? ''}
                    onChange={(e) => setEditFormData({ ...editFormData, confidence: e.target.value === '' ? null : Number(e.target.value) })} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={3} label="Warnings (one per line)"
                    value={warningsText}
                    onChange={(e) => setWarningsText(e.target.value)} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={2} label="AI rule"
                    value={editFormData.aiRule || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, aiRule: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={2} label="Notes"
                    helperText="Client-facing, appears in generated reports. Keep QA annotations out of this field."
                    value={editFormData.notes || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })} />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField fullWidth size="small" multiline minRows={3}
                    label="Internal audit notes (never shown to clients)"
                    helperText="Data-team QA trail. Put [FLAGGED …] / [UPDATED …] annotations here, this field is not readable by the report generator."
                    value={editFormData.internalAuditNotes || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, internalAuditNotes: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,167,38,0.5)' },
                      '& .MuiInputLabel-root': { color: 'warning.main' },
                    }} />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider', zIndex: 1 }}>
          <Button
            onClick={() => {
              setEditDialogOpen(false);
              setEditingIncentive(null);
              setEditFormData({});
              setFormErrors([]);
            }}
            sx={{ color: 'text.secondary' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveIncentive}
            sx={{ bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 700, '&:hover': { bgcolor: 'primary.dark' } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {syncing && (
        <Box sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999 }}>
          <LinearProgress
            sx={{
              bgcolor: 'action.hover',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main',
              },
            }}
          />
        </Box>
      )}
    </Box>
  );
}
