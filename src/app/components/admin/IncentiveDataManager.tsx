import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
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
  Schedule,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  OpenInNew,
  Refresh,
  RequestQuoteOutlined,
} from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import { getTerritories } from '@/services/api';
import type { IncentiveData, IncentiveCalcResult, PendingChange, SyncStatus, SyncSettings, SyncSettingsUpdate } from '@/services/admin.types';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { EYEBROW_SX, PANEL_SX } from './adminSurfaces';
import { AdminAccessDenied } from './AdminAccessDenied';

/** Section surface shared by every panel on this page, so the calculator, the
 *  sync strip and the table read as one console rather than three widgets. */

export function IncentiveDataManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canEditIncentiveData')) {
    return (
      <AdminAccessDenied
        requiredPermission="Edit Incentive Data"
        requiredRole="Master Admin, Senior Admin, or Data Admin"
      />
    );
  }

  return <IncentiveDataManagerContent />;
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
  return REGION_COLOURS[region || ''] || 'divider';
}

function statusChipProps(status?: string) {
  const s = (status || '').toLowerCase();
  if (s === 'active') return { label: 'Active', bg: 'rgba(46,125,50,0.2)', fg: 'success.main' };
  if (s === 'suspended') return { label: 'Suspended', bg: 'rgba(244,67,54,0.2)', fg: 'error.main' };
  if (s === 'no_programme') return { label: 'No Programme', bg: 'rgba(117,117,117,0.25)', fg: 'text.secondary' };
  if (s === 'admin_verify_required') return { label: 'Verify Required', bg: 'rgba(255,152,0,0.2)', fg: 'warning.main' };
  return { label: status || 'Unknown', bg: 'rgba(117,117,117,0.2)', fg: 'text.secondary' };
}

function verificationChipProps(v?: string | null) {
  const s = (v || '').toLowerCase();
  if (s.startsWith('verified')) return { label: v || 'Verified', bg: 'action.selected', fg: 'primary.main' };
  if (s.startsWith('verify')) return { label: 'Needs Verify', bg: 'rgba(255,152,0,0.2)', fg: 'warning.main' };
  if (s.startsWith('inherited')) return { label: v || 'Inherited', bg: 'rgba(117,117,117,0.25)', fg: 'text.secondary' };
  return { label: v || '-', bg: 'rgba(117,117,117,0.15)', fg: 'text.secondary' };
}

function confidenceColour(c?: number | null): string {
  if (c == null) return 'text.disabled';
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
    <Box sx={{ ...PANEL_SX, mb: 3 }}>
      <Typography sx={EYEBROW_SX}>QUALIFYING SPEND CALCULATOR</Typography>
      <Typography sx={{ fontSize: 14, color: 'text.primary', fontWeight: 600, mt: 0.5 }}>
        What a production can actually claim against a given budget
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', mb: 2, maxWidth: '76ch' }}>
        Computed server-side by the report engine, which is the single source of truth. Non-GBP budgets use an
        approximate illustrative rate, so treat the figures as indicative rather than quotable.
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
          {calculating ? 'Calculating' : 'Calculate'}
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
                [`Qualifying spend (${result.qualifyingSpendPct || '-'})`, result.qualifyingSpend],
                ['Gross rebate', result.grossRebate],
                ['Net rebate', result.netRebate],
                ['Net budget', result.netBudget],
              ].filter(([, v]) => v).map(([k, v]) => (
                <Box key={String(k)}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>{k}</Typography>
                  <Typography variant="h6" sx={{ color: k === 'Net rebate' ? 'primary.main' : 'text.primary', fontWeight: 700 }}>{v}</Typography>
                </Box>
              ))}
            </Box>
          )}
          {(result.rateGrossDisplay || result.rateNetDisplay) && (
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
              Rate: {result.rateGrossDisplay || '-'} gross{result.rateNetDisplay ? ` · ${result.rateNetDisplay} net` : ''}
            </Typography>
          )}
          {(result.notes || []).map((n, i) => (
            <Typography key={i} variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>{n}</Typography>
          ))}
          {result.fxNote && <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>{result.fxNote}</Typography>}
        </Box>
      )}
    </Box>
  );
}

function IncentiveDataManagerContent() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
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
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null);
  // Read-only detail for the row an admin clicked. Column filtering and
  // sorting are the table's job, so the page keeps no filter state of its own.
  const [detailRow, setDetailRow] = useState<IncentiveData | null>(null);
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
        .then((ts) => setTerritoryOptions(ts.map((entry) => entry.label)))
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
    setSyncErrorMessage(null);
    const { data, error } = await adminApi.triggerIncentiveSync();
    setSyncing(false);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }
    if (data) {
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
    setActionInProgressId(change.id);
    setSyncErrorMessage(null);
    const { error } = await adminApi.approveIncentivePendingChange(change.id);
    setActionInProgressId(null);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }
    setPendingChanges(prev => prev.filter(c => c.id !== change.id));
    // Refresh incentives and sync status since the approved change updates the underlying record
    const [incentivesRes, statusRes] = await Promise.all([
      adminApi.getIncentives(500, 0),
      adminApi.getIncentiveSyncStatus(),
    ]);
    if (incentivesRes.data) setIncentives(incentivesRes.data.items);
    if (statusRes.data) setSyncStatus(statusRes.data);
  };

  const handleRejectChange = async (change: PendingChange) => {
    setActionInProgressId(change.id);
    setSyncErrorMessage(null);
    const { error } = await adminApi.rejectIncentivePendingChange(change.id);
    setActionInProgressId(null);
    if (error) {
      setSyncErrorMessage(error);
      return;
    }
    setPendingChanges(prev => prev.filter(c => c.id !== change.id));
    const statusRes = await adminApi.getIncentiveSyncStatus();
    if (statusRes.data) setSyncStatus(statusRes.data);
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

    // warnings: one per line, stored as a JSON array (verbatim, no derivation)
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
    if (!dateStr) return 'unknown';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const stats = useMemo(() => ({
    total: incentives.length,
    active: incentives.filter((i) => (i.status || '').toLowerCase() === 'active').length,
    verified: incentives.filter((i) => (i.verificationStatus || '').toLowerCase().startsWith('verified')).length,
    needsVerify: incentives.filter((i) => (i.verificationStatus || '').toLowerCase().startsWith('verify')).length,
    pooled: incentives.filter((i) => !!i.annualProgrammeCap).length,
    territories: new Set(incentives.map((i) => i.territory)).size,
  }), [incentives]);

  const openNewRow = useCallback(() => {
    setEditingIncentive(null);
    setEditFormData({ ...NEW_ROW_DEFAULTS });
    setWarningsText('');
    setFormErrors([]);
    setEditDialogOpen(true);
  }, []);

  const columns = useMemo<Column<IncentiveData>[]>(() => [
    {
      key: 'territory', header: 'TERRITORY', width: '1.25fr',
      sortValue: (i) => i.territory || '',
      render: (i) => (
        <Box sx={{ display: 'flex', alignItems: 'stretch', gap: 1, minWidth: 0 }}>
          {/* Region reads as a colour bar rather than another chip, so the row
              stays scannable without adding a tenth column. */}
          <Box sx={{ width: 3, flexShrink: 0, bgcolor: regionColour(i.region) }} />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {i.territory}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>{i.region || 'Region not set'}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      key: 'program', header: 'PROGRAMME', width: '1.7fr',
      sortValue: (i) => i.program || '',
      render: (i) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {i.program}
          </Typography>
          {i.rateType && (
            <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>{i.rateType.replace(/_/g, ' ')}</Typography>
          )}
        </Box>
      ),
    },
    {
      key: 'rate', header: 'RATE', width: '1fr',
      sortValue: (i) => i.rateGross ?? -1,
      render: (i) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.textPrimary }}>
            {i.rateGrossDisplay || i.rate || 'Not recorded'}
          </Typography>
          <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>
            gross{i.rateNetDisplay ? `, ${i.rateNetDisplay} net` : ''}
          </Typography>
        </Box>
      ),
    },
    {
      key: 'cap', header: 'PER-PROJECT CAP', width: '1.3fr',
      sortValue: (i) => i.rebateCapDisplay || i.cap || '',
      render: (i) => (
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontSize: 13.5, color: (i.rebateCapDisplay || i.cap) ? t.textSecondary : t.textFaint, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {i.rebateCapDisplay || i.cap || 'No cap recorded'}
          </Typography>
          {i.qsBasis && (
            <Tooltip title={i.qsBasis}>
              <Typography sx={{ fontSize: 11.5, color: t.textFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                QS: {i.qsBasis}
              </Typography>
            </Tooltip>
          )}
        </Box>
      ),
    },
    {
      key: 'annualProgrammeCap', header: 'ANNUAL POOL', width: '1.2fr',
      sortValue: (i) => i.annualProgrammeCap || '',
      render: (i) => (i.annualProgrammeCap ? (
        <Tooltip title={i.annualProgrammeCap}>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {i.annualProgrammeCap}
          </Typography>
        </Tooltip>
      ) : (
        <Typography sx={{ fontSize: 12.5, color: t.textFaint }}>Uncapped pool</Typography>
      )),
    },
    {
      key: 'mechanismPattern', header: 'MECHANISM', width: '0.8fr', filterSelect: true,
      sortValue: (i) => (i.mechanismPattern ? `Pattern ${i.mechanismPattern}` : 'Unclassified'),
      render: (i) => (
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: i.mechanismPattern ? t.textSecondary : t.textFaint }}>
          {i.mechanismPattern ? `Pattern ${i.mechanismPattern}` : 'Unclassified'}
        </Typography>
      ),
    },
    {
      key: 'status', header: 'STATUS', width: '1fr', filterSelect: true,
      sortValue: (i) => statusChipProps(i.status).label,
      render: (i) => {
        const s = statusChipProps(i.status);
        return <Chip size="small" label={s.label} sx={{ bgcolor: s.bg, color: s.fg, fontWeight: 700, fontSize: '0.7rem' }} />;
      },
    },
    {
      key: 'verificationStatus', header: 'VERIFICATION', width: '1.1fr', filterSelect: true,
      sortValue: (i) => verificationChipProps(i.verificationStatus).label,
      render: (i) => {
        const v = verificationChipProps(i.verificationStatus);
        return (
          <Tooltip title={i.lastVerifiedAt ? `Last verified ${i.lastVerifiedAt}` : 'Never verified'}>
            <Chip size="small" label={v.label} sx={{ bgcolor: v.bg, color: v.fg, fontWeight: 600, fontSize: '0.7rem' }} />
          </Tooltip>
        );
      },
    },
    {
      key: 'confidence', header: 'CONFIDENCE', width: '0.9fr',
      sortValue: (i) => i.confidence ?? -1,
      render: (i) => (i.confidence == null ? (
        <Typography sx={{ fontSize: 12.5, color: t.textFaint }}>Not scored</Typography>
      ) : (
        <Box sx={{ width: '100%', minWidth: 76 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, i.confidence)}
            sx={{ height: 4, bgcolor: t.inputBg, '& .MuiLinearProgress-bar': { bgcolor: confidenceColour(i.confidence) } }}
          />
          <Typography sx={{ fontSize: 11.5, color: t.textFaint, mt: 0.4, fontVariantNumeric: 'tabular-nums' }}>
            {i.confidence} of 100
          </Typography>
        </Box>
      )),
    },
  ], [t]);

  useHeaderActions(
    <>
      <Button size="small" startIcon={<Refresh />} onClick={() => void handleAutoSync()} disabled={syncing}>
        {syncing ? 'Syncing' : 'Run sync now'}
      </Button>
      <Button size="small" startIcon={<Schedule />} onClick={() => void handleOpenSyncSettings()}>
        Sync settings
      </Button>
      <Button size="small" variant="contained" startIcon={<Add />} onClick={openNewRow}>
        Add programme
      </Button>
    </>,
    [syncing, openNewRow],
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

      {/* Verification coverage leads, because an unverified programme is what
          puts a wrong rebate into a customer report. */}
      <Box sx={{ ...PANEL_SX, mb: 3, display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(220px, 1fr) 2fr' }, gap: { xs: 3, md: 4 }, alignItems: 'start' }}>
        <Box>
          <Typography sx={EYEBROW_SX}>VERIFIED PROGRAMMES</Typography>
          <Typography sx={{ fontSize: { xs: 34, md: 42 }, fontWeight: 800, color: t.textPrimary, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>
            {stats.verified}
            <Typography component="span" sx={{ fontSize: 17, fontWeight: 600, color: t.textSecondary }}>
              {' '}of {stats.total}
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 13, color: stats.needsVerify > 0 ? t.warning : t.textSecondary, mt: 0.5, fontWeight: stats.needsVerify > 0 ? 600 : 400 }}>
            {stats.needsVerify > 0
              ? `${stats.needsVerify} still need verification before a report can rely on them`
              : 'Every programme has been verified'}
          </Typography>
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2.5 }}>
          {([
            ['Active', stats.active, 'Open to applications'],
            ['Territories', stats.territories, 'Distinct jurisdictions'],
            ['Annual pool caps', stats.pooled, 'Fund can be exhausted'],
            ['Pending changes', pendingChanges.length, pendingChanges.length ? 'Awaiting your review' : 'Nothing to review'],
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

      {incentives.length > 0 && <QualifyingSpendCalculator incentives={incentives} />}

      {/* Sync state as one sentence. Three tinted boxes for three numbers gave
          the schedule more weight than the programmes themselves. */}
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

      {/* Sync Error Alert */}
      {syncErrorMessage && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSyncErrorMessage(null)}>
          {syncErrorMessage}
        </Alert>
      )}

      {/* Pending Changes Alert */}
      {pendingChanges.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 3 }}
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
          <strong>
            {pendingChanges.length} {pendingChanges.length === 1 ? 'change' : 'changes'} detected
          </strong>{' '}
          by the automated source sync. Nothing is applied until you approve it.
        </Alert>
      )}

      {/* Pending Changes Section */}
      <Collapse in={showPendingChanges}>
        <Box sx={{ mb: 3, border: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
          <Box sx={{ p: 2.5, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={EYEBROW_SX}>PENDING CHANGES FOR REVIEW</Typography>
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
                          Stored value
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 600 }}>
                          {change.currentValue ?? 'Not set'}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 2 }} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Typography sx={{ color: 'text.secondary', fontSize: 20 }}>&rarr;</Typography>
                      </Grid>
                      <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                          Detected value
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 600 }}>
                          {change.detectedValue}
                        </Typography>
                      </Grid>
                    </Grid>
                    <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                      <Chip
                        label={`${change.confidence} confidence`}
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
                      startIcon={actionInProgressId === change.id ? <CircularProgress size={16} color="inherit" /> : <CheckCircle />}
                      disabled={actionInProgressId === change.id}
                      onClick={() => void handleApproveChange(change)}
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
                      disabled={actionInProgressId === change.id}
                      onClick={() => void handleRejectChange(change)}
                      sx={{ borderColor: 'divider', color: 'text.secondary' }}
                    >
                      Reject
                    </Button>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>

      <DataTable<IncentiveData>
        title="Incentive programmes"
        columns={columns}
        rows={incentives}
        getRowId={(i) => i.id || `${i.territory}-${i.program}`}
        pageSize={15}
        itemNoun="programme"
        minWidth={1320}
        maxHeight={640}
        onRowClick={(i) => setDetailRow(i)}
        emptyIcon={<RequestQuoteOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
        emptyMessage="No incentive programmes have been recorded. Every report that quotes a rebate reads from this table."
        rowActions={(i) => (
          <>
            <Tooltip title="Edit this programme">
              <IconButton
                size="small"
                onClick={() => {
                  setEditingIncentive(i);
                  setEditFormData(i);
                  setWarningsText(parseWarnings(i.warningsJson).join('\n'));
                  setFormErrors([]);
                  setEditDialogOpen(true);
                }}
                sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}
              >
                <Edit sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete this programme">
              <IconButton
                size="small"
                onClick={() => i.id && void handleDeleteIncentive(i.id)}
                sx={{ color: t.textSecondary, '&:hover': { color: t.error } }}
              >
                <Delete sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </>
        )}
      />

      {/* Row detail. The formula, warnings and source are what an admin checks
          before trusting a row, and they are too long to live in a cell. */}
      <Dialog
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
      >
        {detailRow && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              {detailRow.territory}
              <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>
                {detailRow.program}
              </Typography>
            </DialogTitle>
            <DialogContent>
              {detailRow.calcFormula ? (
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={EYEBROW_SX}>CALCULATION FORMULA</Typography>
                  <Typography sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: 12.5, whiteSpace: 'pre-wrap', mt: 0.5 }}>
                    {detailRow.calcFormula}
                  </Typography>
                </Box>
              ) : (
                <Alert severity="warning" sx={{ mb: 2.5 }}>
                  No calculation formula is recorded, so the qualifying spend calculator cannot compute this programme.
                </Alert>
              )}

              {parseWarnings(detailRow.warningsJson).length > 0 && (
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={EYEBROW_SX}>WARNINGS</Typography>
                  {parseWarnings(detailRow.warningsJson).map((w, wi) => (
                    <Typography key={wi} sx={{ fontSize: 13, color: 'warning.main', mt: 0.5 }}>{w}</Typography>
                  ))}
                </Box>
              )}

              {detailRow.aiRule && (
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={EYEBROW_SX}>REPORT RULE</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>{detailRow.aiRule}</Typography>
                </Box>
              )}

              {detailRow.budgetEligibilityCeiling && (
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={EYEBROW_SX}>ELIGIBILITY CEILING</Typography>
                  <Typography sx={{ fontSize: 13, color: 'error.main', mt: 0.5 }}>{detailRow.budgetEligibilityCeiling}</Typography>
                </Box>
              )}

              {detailRow.paymentTimeline && (
                <Box sx={{ mb: 2.5 }}>
                  <Typography sx={EYEBROW_SX}>PAYMENT TIMELINE</Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>{detailRow.paymentTimeline}</Typography>
                </Box>
              )}

              {detailRow.sourceUrl ? (
                <Link href={detailRow.sourceUrl} target="_blank" rel="noopener" sx={{ fontSize: 13, display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                  Official source <OpenInNew sx={{ fontSize: 13 }} />
                </Link>
              ) : (
                <Typography sx={{ fontSize: 13, color: 'error.main' }}>No source URL recorded.</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDetailRow(null)} sx={{ color: 'text.secondary' }}>Close</Button>
              <Button
                variant="contained"
                onClick={() => {
                  setEditingIncentive(detailRow);
                  setEditFormData(detailRow);
                  setWarningsText(parseWarnings(detailRow.warningsJson).join('\n'));
                  setFormErrors([]);
                  setDetailRow(null);
                  setEditDialogOpen(true);
                }}
              >
                Edit
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Auto-Sync Settings Dialog */}
      <Dialog
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
      >
        <DialogTitle sx={{ color: 'primary.main', fontWeight: 600 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule />
            Automated sync configuration
          </Box>
        </DialogTitle>
        <DialogContent>
          {syncSettingsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: 'primary.main' }} />
            </Box>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 3 }}>
                <strong>How it works.</strong> On the schedule below, an automated agent reads the official government
                pages and PDFs listed here, extracts the incentive figures, and queues any difference for your review.
                Nothing reaches a customer report until you approve it.
              </Alert>

              {syncSettings && (
                <Box sx={{ mb: 3, p: 2, border: 1, borderColor: 'divider' }}>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
                    Last sync <strong>{formatDate(syncSettings.lastSyncAt)}</strong>
                  </Typography>
                  <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
                    Next scheduled <strong>{formatDate(syncSettings.nextScheduledCheck)}</strong>
                  </Typography>
                </Box>
              )}

              <Typography sx={{ ...EYEBROW_SX, mb: 1 }}>MONITORED OFFICIAL SOURCES</Typography>

              <Box sx={{ border: 1, borderColor: 'divider' }}>
                {incentives.filter((i) => i.autoSyncEnabled).length === 0 && (
                  <Typography sx={{ p: 2, fontSize: 13, color: 'text.secondary' }}>
                    No programme has automated syncing enabled yet.
                  </Typography>
                )}
                {incentives.filter((i) => i.autoSyncEnabled).map((incentive, index, arr) => (
                  <Box
                    key={incentive.id || incentive.territory}
                    sx={{ p: 2, borderBottom: index < arr.length - 1 ? 1 : 0, borderColor: 'divider' }}
                  >
                    <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: 'text.primary' }}>
                      {incentive.territory}
                    </Typography>
                    {incentive.sourceUrl ? (
                      <Link
                        href={incentive.sourceUrl}
                        target="_blank"
                        rel="noopener"
                        sx={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 0.5, wordBreak: 'break-all' }}
                      >
                        {incentive.sourceUrl}
                        <OpenInNew sx={{ fontSize: 12, flexShrink: 0 }} />
                      </Link>
                    ) : (
                      <Typography sx={{ fontSize: 12.5, color: 'error.main' }}>
                        Syncing is on but no source URL is recorded.
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>

              <Box sx={{ mt: 3 }}>
                <Typography sx={{ ...EYEBROW_SX, mb: 1 }}>SYNC SCHEDULE</Typography>
                <TextField
                  select
                  fullWidth
                  value={syncSettingsForm.schedule || syncSettings?.schedule || 'quarterly'}
                  onChange={(e) => setSyncSettingsForm({ ...syncSettingsForm, schedule: e.target.value as SyncSettingsUpdate['schedule'] })}
                  slotProps={{ select: { native: true } }}
                >
                  <option value="monthly">Monthly (1st of each month)</option>
                  <option value="quarterly">Quarterly (Jan, Apr, Jul, Oct)</option>
                  <option value="biannual">Twice a year (Jan, Jul)</option>
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
          <Button variant="contained" onClick={handleSaveSyncSettings} disabled={syncSettingsLoading}>
            Save settings
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
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingIncentive ? `Edit ${editingIncentive.territory}` : 'Add an incentive programme'}
        </DialogTitle>
        <DialogContent sx={{ pb: 1 }}>
          {formErrors.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formErrors.map((e, i) => <div key={i}>{e}</div>)}
            </Alert>
          )}
          {!editingIncentive && (
            <Alert severity="info" sx={{ mb: 2 }}>
              A new programme starts at status <strong>Verify required</strong>, verification{' '}
              <strong>verify-required</strong> and confidence <strong>30</strong>. It stays out of report scoring until
              an admin promotes it deliberately.
            </Alert>
          )}
          {!editFormData.calcFormula?.trim() && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              No calculation formula is set, so the qualifying spend calculator cannot compute this programme. You
              can still save.
            </Alert>
          )}

          {/* ── Identity ── */}
          <Accordion defaultExpanded sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Identity</Typography>
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
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Rates</Typography>
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
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Qualifying spend</Typography>
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
                       />}
                    label="ATL costs included in qualifying spend (atl_exempt)" />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* ── Caps & ceilings ── */}
          <Accordion sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Caps &amp; ceilings</Typography>
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
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Engine</Typography>
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
                       />}
                    label="Supplementary credit (spend-subset uplift, never a full-budget alternative)" />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* ── Payment ── */}
          <Accordion sx={{ bgcolor: 'background.paper', color: 'text.primary', border: 1, borderColor: 'divider' }}>
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Payment</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <TextField fullWidth size="small" label="Payment reliability (0 to 1)" type="number"
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
            <AccordionSummary expandIcon={<ExpandMore sx={{ color: 'text.secondary' }} />}>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>Governance &amp; verification</Typography>
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
                  <TextField fullWidth size="small" label="Confidence (0 to 100)" type="number"
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
                    helperText="Data-team QA trail. Put [FLAGGED ...] and [UPDATED ...] annotations here, this field is not readable by the report generator."
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
          <Button variant="contained" onClick={handleSaveIncentive} sx={{ fontWeight: 700 }}>
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
