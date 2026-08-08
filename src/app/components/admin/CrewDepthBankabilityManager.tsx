import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  TextField,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  IconButton,
  Tooltip,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
} from '@mui/material';
import { Edit, Refresh, PublicOutlined } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { TerritoryProfileData } from '@/services/admin.types';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { DataTable, type Column } from '@/app/components/user/b2c/DataTable';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
import { AdminAccessDenied } from './AdminAccessDenied';

// Rating bands are DISPLAY ONLY and never stored. Per the source tool's own
// header these are PROVISIONAL placeholder cutoffs derived from only six
// fully-verified territories. A band is derived only when BOTH the
// certification and payment windows are verified; anything less reads
// "Insufficient data". A suspended programme reads "Not bankable, confirmed
// suspended" because that is a sourced fact, not a derived number.
interface RatingBand {
  label: string;
  detail?: string;
  fg: string;
  bg: string;
  derived: boolean;
}

function deriveRatingBand(p: TerritoryProfileData): RatingBand {
  if (p.bankabilitySuspended === true) {
    return {
      label: 'Not bankable',
      detail: 'confirmed suspended',
      fg: 'error.main',
      bg: 'rgba(244,67,54,0.15)',
      derived: false, // sourced fact, not a derived cutoff
    };
  }
  const hasCert = p.certWeeksMax != null;
  const hasPay = p.paymentWeeksMax != null;
  if (!hasCert || !hasPay) {
    return { label: 'Insufficient data', fg: 'text.secondary', bg: 'rgba(117,117,117,0.18)', derived: false };
  }
  const totalMax = (p.certWeeksMax || 0) + (p.paymentWeeksMax || 0);
  const contradicted = p.bankabilityRealWorldConfirms === false;
  const detail = contradicted ? 'real-world reports contradict, verify' : 'provisional band';
  if (totalMax <= 26) return { label: 'Most bankable', detail, fg: 'success.main', bg: 'rgba(46,125,50,0.18)', derived: true };
  if (totalMax <= 45) return { label: 'Bankable', detail, fg: '#8bc34a', bg: 'rgba(139,195,74,0.15)', derived: true };
  if (totalMax <= 70) return { label: 'Slow', detail, fg: 'warning.main', bg: 'rgba(255,152,0,0.16)', derived: true };
  return { label: 'Not bankable', detail: `provisional band, ${Math.round(totalMax)} wk total`, fg: 'error.main', bg: 'rgba(244,67,54,0.15)', derived: true };
}

function sourceChip(q?: string | null): { label: string; fg: string } {
  switch ((q || '').toLowerCase()) {
    case 'government_direct': return { label: 'Gov direct', fg: 'success.main' };
    case 'industry_secondary': return { label: 'Industry only', fg: 'info.main' };
    case 'government_plus_industry': return { label: 'Gov + industry', fg: '#8bc34a' };
    case 'unverified': return { label: 'Unverified', fg: 'text.secondary' };
    default: return { label: 'Not recorded', fg: 'text.secondary' };
  }
}

function weeksRange(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return 'Not verified';
  if (min != null && max != null) return min === max ? `${min} wk` : `${min} to ${max} wk`;
  return `${min ?? max} wk`;
}

/** Sorts unverified windows last rather than first, so the rows worth reading
 *  sit at the top when an admin sorts by duration. */
function weeksSort(min?: number | null, max?: number | null): number {
  const v = max ?? min;
  return v == null ? Number.MAX_SAFE_INTEGER : v;
}

const TIER_OPTIONS = ['Extremely Established', 'Established', 'Growing', 'Emerging'];
const SOURCE_QUALITY_OPTIONS = ['government_direct', 'government_plus_industry', 'industry_secondary', 'unverified'];

export function CrewDepthBankabilityManager() {
  const { hasAdminPermission } = useAuth();

  if (!hasAdminPermission('canEditIncentiveData')) {
    return <AdminAccessDenied requiredPermission="Edit Incentive Data" />;
  }

  return <CrewDepthContent />;
}

type View = 'bankability' | 'profiles';

function CrewDepthContent() {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [view, setView] = useState<View>('bankability');
  const [profiles, setProfiles] = useState<TerritoryProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TerritoryProfileData | null>(null);
  const [form, setForm] = useState<Partial<TerritoryProfileData>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const fullScreen = useMediaQuery('(max-width:600px)');

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    const { data, error } = await adminApi.getTerritoryProfiles(500, 0);
    if (error || !data) setFetchError(error || 'Failed to fetch territory profiles');
    else setProfiles(data.items || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openEdit = (p: TerritoryProfileData) => {
    setEditing(p);
    setForm(p);
    setFormError(null);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditing(null);
    setForm({});
  };

  const handleSave = async () => {
    if (!editing?.id) return;
    const { data, error } = await adminApi.updateTerritoryProfile(editing.id, form);
    if (error || !data) { setFormError(error || 'Save failed'); return; }
    setProfiles(profiles.map((p) => (p.id === editing.id ? data : p)));
    closeEdit();
  };

  const numField = (v: string): number | null => (v === '' ? null : Number(v));

  // Counted from verified fields only, never from a derived band.
  const coverage = useMemo(() => {
    const hasAnyBank = (p: TerritoryProfileData) =>
      p.certWeeksMax != null || p.paymentWeeksMax != null
      || !!p.bankabilitySourceQuality || p.bankabilitySuspended != null;
    const started = profiles.filter(hasAnyBank);
    return {
      total: profiles.length,
      started: started.length,
      complete: started.filter((p) => p.certWeeksMax != null && p.paymentWeeksMax != null).length,
      govDirect: profiles.filter((p) => p.bankabilitySourceQuality === 'government_direct').length,
      suspended: profiles.filter((p) => p.bankabilitySuspended === true).length,
      crewCurated: profiles.filter((p) => p.crewDepthTier != null || p.crewDepthScore != null).length,
      infraCurated: profiles.filter((p) => p.infrastructureTier != null || p.infrastructureScore != null).length,
    };
  }, [profiles]);

  const editAction = useCallback((p: TerritoryProfileData) => (
    <Tooltip title={`Edit ${p.territory}`}>
      <IconButton size="small" onClick={() => openEdit(p)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}>
        <Edit sx={{ fontSize: 18 }} />
      </IconButton>
    </Tooltip>
  ), [t]);

  const territoryCell = useCallback((p: TerritoryProfileData) => (
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {p.territory}
      </Typography>
      {p.region && (
        <Typography sx={{ fontSize: 11.5, color: t.textFaint }}>{p.region}</Typography>
      )}
    </Box>
  ), [t]);

  const bankabilityColumns = useMemo<Column<TerritoryProfileData>[]>(() => [
    {
      key: 'territory', header: 'TERRITORY', width: '1.3fr', clamp: 3,
      sortValue: (p) => p.territory || '',
      render: territoryCell,
    },
    {
      key: 'cert', header: 'CERTIFICATION', width: '1.05fr',
      sortValue: (p) => weeksSort(p.certWeeksMin, p.certWeeksMax),
      render: (p) => (
        <Typography sx={{ fontSize: 13.5, color: p.certWeeksMax == null ? t.textFaint : t.textSecondary, whiteSpace: 'nowrap' }}>
          {weeksRange(p.certWeeksMin, p.certWeeksMax)}
        </Typography>
      ),
    },
    {
      key: 'payment', header: 'PAYMENT', width: '1.05fr',
      sortValue: (p) => weeksSort(p.paymentWeeksMin, p.paymentWeeksMax),
      render: (p) => (
        <Typography sx={{ fontSize: 13.5, color: p.paymentWeeksMax == null ? t.textFaint : t.textSecondary, whiteSpace: 'nowrap' }}>
          {weeksRange(p.paymentWeeksMin, p.paymentWeeksMax)}
        </Typography>
      ),
    },
    {
      key: 'total', header: 'TOTAL WAIT', width: '1fr',
      sortValue: (p) => (p.certWeeksMax == null || p.paymentWeeksMax == null
        ? Number.MAX_SAFE_INTEGER : (p.certWeeksMax || 0) + (p.paymentWeeksMax || 0)),
      render: (p) => {
        // Only a fully verified pair produces a total. Adding a verified window
        // to a missing one would read as a complete figure when it is not.
        if (p.certWeeksMax == null || p.paymentWeeksMax == null) {
          return <Typography sx={{ fontSize: 13.5, color: t.textFaint }}>Not verified</Typography>;
        }
        const min = (p.certWeeksMin ?? p.certWeeksMax) + (p.paymentWeeksMin ?? p.paymentWeeksMax);
        const max = p.certWeeksMax + p.paymentWeeksMax;
        return (
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: t.textPrimary, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
            {weeksRange(min, max)}
          </Typography>
        );
      },
    },
    {
      key: 'rating', header: 'RATING', width: '1.35fr', clamp: 3, filterSelect: true,
      sortValue: (p) => deriveRatingBand(p).label,
      render: (p) => {
        const band = deriveRatingBand(p);
        return (
          <Box sx={{ minWidth: 0 }}>
            <Chip size="small" label={band.label} sx={{ bgcolor: band.bg, color: band.fg, fontWeight: 700, fontSize: '0.7rem' }} />
            {band.detail && (
              <Typography sx={{ fontSize: 11, color: t.textFaint, mt: 0.3 }}>{band.detail}</Typography>
            )}
          </Box>
        );
      },
    },
    {
      key: 'source', header: 'SOURCE', width: '1.15fr', filterSelect: true,
      sortValue: (p) => sourceChip(p.bankabilitySourceQuality).label,
      render: (p) => {
        const source = sourceChip(p.bankabilitySourceQuality);
        return (
          <Tooltip title={p.bankabilitySourceNote || p.bankabilitySourceUrl || 'No source recorded'}>
            <Chip size="small" variant="outlined" label={source.label} sx={{ borderColor: source.fg, color: source.fg, fontSize: '0.7rem' }} />
          </Tooltip>
        );
      },
    },
    {
      key: 'narrative', header: 'REPORT NARRATIVE', width: '2.4fr', clamp: 3,
      sortValue: (p) => p.bankabilityAiRule || '',
      render: (p) => (p.bankabilityAiRule ? (
        // Wraps over three lines, with the full text on hover. This is the copy
        // that reaches a customer report, so an admin has to be able to read it.
        <Tooltip title={p.bankabilityAiRule}>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.45, cursor: 'help' }}>
            {p.bankabilityAiRule}
          </Typography>
        </Tooltip>
      ) : (
        <Typography sx={{ fontSize: 12.5, color: t.textFaint }}>No narrative written</Typography>
      )),
    },
  ], [t, territoryCell]);

  const profileColumns = useMemo<Column<TerritoryProfileData>[]>(() => [
    {
      key: 'territory', header: 'TERRITORY', width: '1.3fr',
      sortValue: (p) => p.territory || '',
      render: territoryCell,
    },
    {
      key: 'crewDepthTier', header: 'CREW DEPTH', width: '1.3fr', filterSelect: true,
      sortValue: (p) => p.crewDepthTier || 'Not curated',
      render: (p) => (p.crewDepthTier ? (
        <Chip size="small" label={p.crewDepthTier} sx={{ bgcolor: t.goldDim, color: t.gold, fontWeight: 600, fontSize: '0.7rem' }} />
      ) : (
        <Chip size="small" variant="outlined" label="Not curated" sx={{ borderColor: t.border, color: t.textFaint, fontSize: '0.7rem' }} />
      )),
    },
    {
      key: 'crewDepthScore', header: 'SCORE', width: '0.6fr', align: 'right',
      sortValue: (p) => p.crewDepthScore ?? -1,
      render: (p) => (
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: p.crewDepthScore == null ? t.textFaint : t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {p.crewDepthScore ?? 'Not set'}
        </Typography>
      ),
    },
    {
      key: 'crewDepthNotes', header: 'CREW EVIDENCE', width: '2fr', clamp: 3,
      sortValue: (p) => p.crewDepthNotes || '',
      render: (p) => (p.crewDepthNotes ? (
        <Tooltip title={p.crewDepthNotes}>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.45, cursor: 'help' }}>
            {p.crewDepthNotes}
          </Typography>
        </Tooltip>
      ) : (
        <Typography sx={{ fontSize: 12.5, color: t.textFaint }}>No named productions cited</Typography>
      )),
    },
    {
      key: 'infrastructureTier', header: 'INFRASTRUCTURE', width: '1.4fr', filterSelect: true,
      sortValue: (p) => p.infrastructureTier || 'Not curated',
      render: (p) => (p.infrastructureTier ? (
        <Chip size="small" label={p.infrastructureTier} sx={{ bgcolor: 'rgba(79,131,204,0.15)', color: 'info.main', fontWeight: 600, fontSize: '0.7rem' }} />
      ) : (
        <Chip size="small" variant="outlined" label="Not curated" sx={{ borderColor: t.border, color: t.textFaint, fontSize: '0.7rem' }} />
      )),
    },
    {
      key: 'infrastructureScore', header: 'SCORE', width: '0.6fr', align: 'right',
      sortValue: (p) => p.infrastructureScore ?? -1,
      render: (p) => (
        <Typography sx={{ fontSize: 14, fontWeight: 700, color: p.infrastructureScore == null ? t.textFaint : t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
          {p.infrastructureScore ?? 'Not set'}
        </Typography>
      ),
    },
    {
      key: 'infrastructureNotes', header: 'INFRASTRUCTURE NOTES', width: '2fr', clamp: 3,
      sortValue: (p) => p.infrastructureNotes || '',
      render: (p) => (p.infrastructureNotes ? (
        <Tooltip title={p.infrastructureNotes}>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.45, cursor: 'help' }}>
            {p.infrastructureNotes}
          </Typography>
        </Tooltip>
      ) : (
        <Typography sx={{ fontSize: 12.5, color: t.textFaint }}>Not written up</Typography>
      )),
    },
  ], [t, territoryCell]);

  useHeaderActions(
    <Button size="small" startIcon={<Refresh />} onClick={() => void load()} disabled={loading}>
      Refresh
    </Button>,
    [load, loading],
  );

  if (loading && profiles.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: 'primary.main' }} />
      </Box>
    );
  }

  const bankability = view === 'bankability';

  return (
    <Box>
      {fetchError && <Alert severity="error" sx={{ mb: 3 }}>{fetchError}</Alert>}

      {/* Research coverage. A count of what is verified is the only honest
          summary here: everything else on the page is provisional. */}
      <Box
        sx={{
          border: 1, borderColor: 'divider', bgcolor: 'background.paper',
          p: 2.5, mb: 3, display: 'flex', flexWrap: 'wrap',
          alignItems: 'baseline', columnGap: 4, rowGap: 1.5,
        }}
      >
        <Box sx={{ mr: 'auto' }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.16em', color: t.textFaint }}>
            RESEARCH COVERAGE
          </Typography>
          <Typography sx={{ fontSize: 26, fontWeight: 800, color: t.textPrimary, lineHeight: 1.2 }}>
            {coverage.complete}
            <Typography component="span" sx={{ fontSize: 15, fontWeight: 600, color: t.textSecondary }}>
              {' '}of {coverage.total} territories fully verified
            </Typography>
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: t.textSecondary, mt: 0.25 }}>
            Only these carry a derived rating. {coverage.started - coverage.complete} more have partial windows.
          </Typography>
        </Box>
        {([
          ['Government direct', coverage.govDirect],
          ['Suspended', coverage.suspended],
          bankability ? null : ['Crew curated', coverage.crewCurated],
          bankability ? null : ['Infrastructure curated', coverage.infraCurated],
        ].filter(Boolean) as [string, number][]).map(([label, value]) => (
          <Box key={label}>
            <Typography sx={{ fontSize: 20, fontWeight: 700, color: t.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: t.textSecondary }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Ratings are <strong>provisional</strong> placeholder cutoffs derived from only six fully verified territories.
        They are display only, never stored, and appear only where both the certification and payment windows are
        verified. Everything else reads <em>Insufficient data</em>. A suspended programme reads{' '}
        <em>Not bankable, confirmed suspended</em>, which is a sourced fact rather than a derived score.
      </Alert>

      <Box sx={{ mb: 2 }}>
        <SegmentedToggle
          value={view}
          onChange={(v) => setView(v as View)}
          options={[
            { value: 'bankability', label: 'Bankability windows' },
            { value: 'profiles', label: 'Crew depth and infrastructure' },
          ]}
        />
      </Box>

      <DataTable<TerritoryProfileData>
        key={view}
        title={bankability ? 'Verified bankability windows' : 'Territory profiles'}
        columns={bankability ? bankabilityColumns : profileColumns}
        rows={profiles}
        getRowId={(p) => p.id || p.territory}
        pageSize={15}
        itemNoun="territory"
        itemNounPlural="territories"
        minWidth={bankability ? 1320 : 1360}
        maxHeight={620}
        emptyIcon={<PublicOutlined sx={{ fontSize: 28, color: t.textFaint }} />}
        emptyMessage="No territory profiles have been loaded."
        rowActions={editAction}
      />

      {/* Honest nulls throughout: a blank field stays null rather than becoming a zero. */}
      <Dialog
        open={editOpen}
        onClose={closeEdit}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
        slotProps={{ paper: { sx: { bgcolor: 'background.paper', border: 1, borderColor: 'divider' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editing?.territory}
          <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 400 }}>
            Leave a field blank to record that it is unverified.
          </Typography>
        </DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 1, mb: 1, letterSpacing: '0.08em' }}>CREW DEPTH</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth size="small" label="Tier"
                value={form.crewDepthTier || ''}
                onChange={(e) => setForm({ ...form, crewDepthTier: e.target.value || null })}>
                <MenuItem value="">Not curated</MenuItem>
                {TIER_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Score (0 to 100)" type="number"
                value={form.crewDepthScore ?? ''}
                onChange={(e) => setForm({ ...form, crewDepthScore: numField(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" multiline minRows={2} label="Crew notes (named-production evidence)"
                value={form.crewDepthNotes || ''}
                onChange={(e) => setForm({ ...form, crewDepthNotes: e.target.value })} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 2.5, mb: 1, letterSpacing: '0.08em' }}>INFRASTRUCTURE</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth size="small" label="Tier"
                value={form.infrastructureTier || ''}
                onChange={(e) => setForm({ ...form, infrastructureTier: e.target.value || null })}>
                <MenuItem value="">Not curated</MenuItem>
                {TIER_OPTIONS.map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Score (0 to 100)" type="number"
                value={form.infrastructureScore ?? ''}
                onChange={(e) => setForm({ ...form, infrastructureScore: numField(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" multiline minRows={2} label="Infrastructure notes"
                value={form.infrastructureNotes || ''}
                onChange={(e) => setForm({ ...form, infrastructureNotes: e.target.value })} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 2.5, mb: 1, letterSpacing: '0.08em' }}>
            BANKABILITY, VERIFIED WINDOWS IN WEEKS
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Cert min" type="number"
                value={form.certWeeksMin ?? ''}
                onChange={(e) => setForm({ ...form, certWeeksMin: numField(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Cert max" type="number"
                value={form.certWeeksMax ?? ''}
                onChange={(e) => setForm({ ...form, certWeeksMax: numField(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Payment min" type="number"
                value={form.paymentWeeksMin ?? ''}
                onChange={(e) => setForm({ ...form, paymentWeeksMin: numField(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Payment max" type="number"
                value={form.paymentWeeksMax ?? ''}
                onChange={(e) => setForm({ ...form, paymentWeeksMax: numField(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select fullWidth size="small" label="Source quality"
                value={form.bankabilitySourceQuality || ''}
                onChange={(e) => setForm({ ...form, bankabilitySourceQuality: e.target.value || null })}>
                <MenuItem value="">Not recorded</MenuItem>
                {SOURCE_QUALITY_OPTIONS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth size="small" label="Source URL"
                value={form.bankabilitySourceUrl || ''}
                onChange={(e) => setForm({ ...form, bankabilitySourceUrl: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Checkbox checked={form.bankabilitySuspended === true}
                  onChange={(e) => setForm({ ...form, bankabilitySuspended: e.target.checked })} />}
                label="Programme suspended (confirmed, renders Not bankable as a sourced fact)" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Checkbox checked={form.bankabilityRealWorldConfirms === true}
                  indeterminate={form.bankabilityRealWorldConfirms == null}
                  onChange={(e) => setForm({ ...form, bankabilityRealWorldConfirms: e.target.checked })} />}
                label="Real-world evidence confirms the stated timing (indeterminate means unconfirmed)" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" multiline minRows={2} label="Source note"
                value={form.bankabilitySourceNote || ''}
                onChange={(e) => setForm({ ...form, bankabilitySourceNote: e.target.value })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" multiline minRows={3} label="Report narrative (fixed text)"
                value={form.bankabilityAiRule || ''}
                onChange={(e) => setForm({ ...form, bankabilityAiRule: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={closeEdit} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} sx={{ fontWeight: 700 }}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
