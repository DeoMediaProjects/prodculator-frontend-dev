import { useState, useEffect } from 'react';
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
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Grid,
  IconButton,
  CircularProgress,
  Tabs,
  Tab,
  FormControlLabel,
  Checkbox,
  useMediaQuery,
} from '@mui/material';
import { Edit, ExpandMore, ExpandLess } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import type { TerritoryProfileData } from '@/services/admin.types';
import { AdminAccessDenied } from './AdminAccessDenied';

// ─────────────────────────────────────────────────────────────────────────────
// Rating bands — DISPLAY ONLY, NEVER STORED.
// Per the source tool's own header these are PROVISIONAL placeholder cutoffs
// derived from only 6 fully-verified territories. A band is only derived when
// BOTH certification and payment windows are verified; anything less is
// "Insufficient Data". A suspended programme is "Not Bankable — confirmed
// suspended" (a sourced fact), never a derived number.
// ─────────────────────────────────────────────────────────────────────────────
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
      label: 'Not Bankable',
      detail: 'confirmed suspended',
      fg: '#f44336',
      bg: 'rgba(244,67,54,0.15)',
      derived: false, // sourced fact, not a derived cutoff
    };
  }
  const hasCert = p.certWeeksMax != null;
  const hasPay = p.paymentWeeksMax != null;
  if (!hasCert || !hasPay) {
    return { label: 'Insufficient Data', fg: '#9e9e9e', bg: 'rgba(117,117,117,0.18)', derived: false };
  }
  const totalMax = (p.certWeeksMax || 0) + (p.paymentWeeksMax || 0);
  const contradicted = p.bankabilityRealWorldConfirms === false;
  const detail = contradicted ? 'real-world reports contradict — verify' : 'provisional band';
  if (totalMax <= 26) return { label: 'Most Bankable', detail, fg: '#66bb6a', bg: 'rgba(46,125,50,0.18)', derived: true };
  if (totalMax <= 45) return { label: 'Bankable', detail, fg: '#8bc34a', bg: 'rgba(139,195,74,0.15)', derived: true };
  if (totalMax <= 70) return { label: 'Slow', detail, fg: '#ffa726', bg: 'rgba(255,152,0,0.16)', derived: true };
  return { label: 'Not Bankable', detail: `provisional band — ${Math.round(totalMax)} wk total`, fg: '#f44336', bg: 'rgba(244,67,54,0.15)', derived: true };
}

function sourceChip(q?: string | null): { label: string; fg: string } {
  switch ((q || '').toLowerCase()) {
    case 'government_direct': return { label: 'Gov Direct', fg: '#66bb6a' };
    case 'industry_secondary': return { label: 'Industry Only', fg: '#4f83cc' };
    case 'government_plus_industry': return { label: 'Gov + Industry', fg: '#8bc34a' };
    case 'unverified': return { label: 'Unverified', fg: '#9e9e9e' };
    default: return { label: '—', fg: '#666' };
  }
}

function weeksRange(min?: number | null, max?: number | null): string {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return min === max ? `${min} wk` : `${min}–${max} wk`;
  return `${min ?? max} wk`;
}

const TIER_OPTIONS = ['Extremely Established', 'Established', 'Growing', 'Emerging'];
const SOURCE_QUALITY_OPTIONS = ['government_direct', 'government_plus_industry', 'industry_secondary', 'unverified'];

const headCell = {
  color: '#D4AF37', fontWeight: 700, textTransform: 'uppercase',
  fontSize: '0.72rem', letterSpacing: 1, whiteSpace: 'nowrap',
} as const;

export function CrewDepthBankabilityManager(props?: any) {
  const auth = props?.useAuthOverride ? props.useAuthOverride() : undefined;
  return <CrewDepthContent authOverride={auth} />;
}

function CrewDepthContent(_props?: any) {
  const { hasAdminPermission } = useAuth();
  const [tab, setTab] = useState(0);
  const [profiles, setProfiles] = useState<TerritoryProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<TerritoryProfileData | null>(null);
  const [form, setForm] = useState<Partial<TerritoryProfileData>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const fullScreen = useMediaQuery('(max-width:600px)');

  useEffect(() => {
    (async () => {
      const { data, error } = await adminApi.getTerritoryProfiles(500, 0);
      if (error || !data) setFetchError(error || 'Failed to fetch territory profiles');
      else setProfiles(data.items || []);
      setLoading(false);
    })();
  }, []);

  if (!hasAdminPermission('canEditIncentiveData')) {
    return <AdminAccessDenied requiredPermission="Edit Incentive Data" />;
  }

  // Stat header — counted from verified fields only, never derived values
  const hasAnyBank = (p: TerritoryProfileData) =>
    p.certWeeksMax != null || p.paymentWeeksMax != null ||
    !!p.bankabilitySourceQuality || p.bankabilitySuspended != null;
  const started = profiles.filter(hasAnyBank);
  const govDirect = profiles.filter((p) => p.bankabilitySourceQuality === 'government_direct');
  const partial = started.filter((p) => p.certWeeksMax == null || p.paymentWeeksMax == null);
  const suspended = profiles.filter((p) => p.bankabilitySuspended === true);
  const notStarted = profiles.filter((p) => !hasAnyBank(p));
  const curatedCrew = profiles.filter((p) => p.crewDepthTier != null || p.crewDepthScore != null);
  const curatedInfra = profiles.filter((p) => p.infrastructureTier != null || p.infrastructureScore != null);

  const openEdit = (p: TerritoryProfileData) => {
    setEditing(p);
    setForm(p);
    setFormError(null);
    setEditOpen(true);
  };

  const handleSave = async () => {
    if (!editing?.id) return;
    const { data, error } = await adminApi.updateTerritoryProfile(editing.id, form);
    if (error || !data) { setFormError(error || 'Save failed'); return; }
    setProfiles(profiles.map((p) => (p.id === editing.id ? data : p)));
    setEditOpen(false);
    setEditing(null);
    setForm({});
  };

  const numField = (v: string): number | null => (v === '' ? null : Number(v));

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#D4AF37', mb: 1 }}>
            Crew Depth &amp; Bankability
          </Typography>
          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Real data only · bankability payment timing + crew depth quality tiers · no cost data
          </Typography>
        </Box>
      </Box>

      {fetchError && <Alert severity="error" sx={{ mb: 3 }}>{fetchError}</Alert>}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress sx={{ color: '#D4AF37' }} />
        </Box>
      )}

      {!loading && (
        <>
          <Alert severity="info" sx={{ mb: 3, bgcolor: 'rgba(212,175,55,0.07)', color: '#c9b45c', border: '1px solid rgba(212,175,55,0.25)' }}>
            <strong>How to read this:</strong> ratings are <strong>PROVISIONAL</strong> placeholder
            cutoffs derived from only 6 fully-verified territories — display-only, never stored, and
            only shown when both certification and payment windows are verified. Territories without
            both show <em>Insufficient Data</em>. South Africa's suspended programmes read
            <em> Not Bankable — confirmed suspended</em> (a sourced fact, not a derived score).
          </Alert>

          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            sx={{
              mb: 3,
              '& .MuiTab-root': { color: '#a0a0a0' },
              '& .Mui-selected': { color: '#D4AF37 !important' },
              '& .MuiTabs-indicator': { backgroundColor: '#D4AF37' },
            }}
          >
            <Tab label="Bankability — Verified Data" />
            <Tab label="Territory Profiles (Crew Depth + Infra)" />
          </Tabs>

          {tab === 0 && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  ['Research Started', started.length, '#D4AF37'],
                  ['Government-Direct', govDirect.length, '#66bb6a'],
                  ['Partial Data', partial.length, '#ffa726'],
                  ['Not Bankable (suspended)', suspended.length, '#f44336'],
                  ['Not Started', notStarted.length, '#9e9e9e'],
                ].map(([label, value, colour]) => (
                  <Grid size={{ xs: 6, sm: 4, md: 2.4 }} key={String(label)}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.15)' }}>
                      <Typography variant="h5" sx={{ color: String(colour), fontWeight: 800 }}>{String(value)}</Typography>
                      <Typography variant="caption" sx={{ color: '#777', textTransform: 'uppercase', letterSpacing: 0.6 }}>{String(label)}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', maxWidth: '100%' }}>
                <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCell, position: 'sticky', left: 0, zIndex: 3, bgcolor: '#0a0a0a' }}>Territory</TableCell>
                        <TableCell sx={headCell}>Certification</TableCell>
                        <TableCell sx={headCell}>Payment</TableCell>
                        <TableCell sx={headCell}>Total</TableCell>
                        <TableCell sx={headCell}>Rating</TableCell>
                        <TableCell sx={headCell}>Source</TableCell>
                        <TableCell sx={headCell}>Report Narrative</TableCell>
                        <TableCell sx={headCell}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profiles.map((p) => {
                        const band = deriveRatingBand(p);
                        const source = sourceChip(p.bankabilitySourceQuality);
                        const expanded = expandedId === p.id;
                        const totalMin = (p.certWeeksMin ?? null) != null || (p.paymentWeeksMin ?? null) != null
                          ? (p.certWeeksMin || 0) + (p.paymentWeeksMin || 0) : null;
                        const totalMax = (p.certWeeksMax ?? null) != null || (p.paymentWeeksMax ?? null) != null
                          ? (p.certWeeksMax || 0) + (p.paymentWeeksMax || 0) : null;
                        return (
                          <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'rgba(212,175,55,0.05)' } }}>
                            <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: '#0a0a0a', minWidth: 130 }}>
                              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{p.territory}</Typography>
                              <Typography variant="caption" sx={{ color: '#777' }}>{p.region || ''}</Typography>
                            </TableCell>
                            <TableCell sx={{ color: '#ccc', whiteSpace: 'nowrap' }}>{weeksRange(p.certWeeksMin, p.certWeeksMax)}</TableCell>
                            <TableCell sx={{ color: '#ccc', whiteSpace: 'nowrap' }}>{weeksRange(p.paymentWeeksMin, p.paymentWeeksMax)}</TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 700, whiteSpace: 'nowrap' }}>{weeksRange(totalMin, totalMax)}</TableCell>
                            <TableCell sx={{ minWidth: 150 }}>
                              <Chip size="small" label={band.label} sx={{ bgcolor: band.bg, color: band.fg, fontWeight: 700, fontSize: '0.7rem' }} />
                              {band.detail && (
                                <Typography variant="caption" sx={{ color: '#777', display: 'block', mt: 0.3 }}>{band.detail}</Typography>
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip size="small" variant="outlined" label={source.label} sx={{ borderColor: source.fg, color: source.fg, fontSize: '0.7rem' }} />
                            </TableCell>
                            <TableCell sx={{ maxWidth: 420, minWidth: 240 }}>
                              {p.bankabilityAiRule ? (
                                <Typography variant="caption" sx={{ color: '#bbb', display: 'block', lineHeight: 1.5, ...(expanded ? {} : { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }) }}>
                                  {p.bankabilityAiRule}
                                </Typography>
                              ) : (
                                <Typography variant="caption" sx={{ color: '#555' }}>—</Typography>
                              )}
                              {p.bankabilitySourceNote && expanded && (
                                <Typography variant="caption" sx={{ color: '#888', display: 'block', mt: 0.5 }}>Source: {p.bankabilitySourceNote}</Typography>
                              )}
                            </TableCell>
                            <TableCell sx={{ whiteSpace: 'nowrap' }}>
                              {p.bankabilityAiRule && (
                                <IconButton size="small" onClick={() => setExpandedId(expanded ? null : (p.id || null))}>
                                  {expanded ? <ExpandLess sx={{ color: '#a0a0a0', fontSize: 18 }} /> : <ExpandMore sx={{ color: '#a0a0a0', fontSize: 18 }} />}
                                </IconButton>
                              )}
                              <IconButton size="small" onClick={() => openEdit(p)}>
                                <Edit sx={{ color: '#D4AF37', fontSize: 18 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}

          {tab === 1 && (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                {[
                  ['Territories', profiles.length, '#D4AF37'],
                  ['Crew Depth Curated', curatedCrew.length, '#66bb6a'],
                  ['Infrastructure Curated', curatedInfra.length, '#66bb6a'],
                  ['Not Curated (crew)', profiles.length - curatedCrew.length, '#9e9e9e'],
                ].map(([label, value, colour]) => (
                  <Grid size={{ xs: 6, sm: 3 }} key={String(label)}>
                    <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: '#0a0a0a', border: '1px solid rgba(212,175,55,0.15)' }}>
                      <Typography variant="h5" sx={{ color: String(colour), fontWeight: 800 }}>{String(value)}</Typography>
                      <Typography variant="caption" sx={{ color: '#777', textTransform: 'uppercase', letterSpacing: 0.6 }}>{String(label)}</Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>

              <Paper sx={{ bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)', maxWidth: '100%' }}>
                <TableContainer sx={{ overflowX: 'auto', maxWidth: '100%' }}>
                  <Table size="small" sx={{ minWidth: 980 }}>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ ...headCell, position: 'sticky', left: 0, zIndex: 3, bgcolor: '#0a0a0a' }}>Territory</TableCell>
                        <TableCell sx={headCell}>Crew Depth Tier</TableCell>
                        <TableCell sx={headCell}>Crew Score</TableCell>
                        <TableCell sx={headCell}>Crew Notes</TableCell>
                        <TableCell sx={headCell}>Infra Tier</TableCell>
                        <TableCell sx={headCell}>Infra Score</TableCell>
                        <TableCell sx={headCell}>Infra Notes</TableCell>
                        <TableCell sx={headCell}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {profiles.map((p) => {
                        const crewCurated = p.crewDepthTier != null || p.crewDepthScore != null;
                        const infraCurated = p.infrastructureTier != null || p.infrastructureScore != null;
                        return (
                          <TableRow key={p.id} sx={{ '&:hover': { bgcolor: 'rgba(212,175,55,0.05)' } }}>
                            <TableCell sx={{ position: 'sticky', left: 0, zIndex: 2, bgcolor: '#0a0a0a', minWidth: 130 }}>
                              <Typography variant="body2" sx={{ color: '#fff', fontWeight: 600 }}>{p.territory}</Typography>
                              <Typography variant="caption" sx={{ color: '#777' }}>{p.region || ''}</Typography>
                            </TableCell>
                            <TableCell>
                              {crewCurated && p.crewDepthTier ? (
                                <Chip size="small" label={p.crewDepthTier} sx={{ bgcolor: 'rgba(212,175,55,0.15)', color: '#D4AF37', fontWeight: 600, fontSize: '0.7rem' }} />
                              ) : (
                                <Chip size="small" variant="outlined" label="Not curated" sx={{ borderColor: '#444', color: '#777', fontSize: '0.7rem' }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 700 }}>{p.crewDepthScore ?? '—'}</TableCell>
                            <TableCell sx={{ maxWidth: 320, minWidth: 200 }}>
                              <Typography variant="caption" sx={{ color: '#bbb', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {p.crewDepthNotes || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {infraCurated && p.infrastructureTier ? (
                                <Chip size="small" label={p.infrastructureTier} sx={{ bgcolor: 'rgba(79,131,204,0.15)', color: '#4f83cc', fontWeight: 600, fontSize: '0.7rem' }} />
                              ) : (
                                <Chip size="small" variant="outlined" label="Not curated" sx={{ borderColor: '#444', color: '#777', fontSize: '0.7rem' }} />
                              )}
                            </TableCell>
                            <TableCell sx={{ color: '#fff', fontWeight: 700 }}>{p.infrastructureScore ?? '—'}</TableCell>
                            <TableCell sx={{ maxWidth: 320, minWidth: 200 }}>
                              <Typography variant="caption" sx={{ color: '#bbb', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {p.infrastructureNotes || '—'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={() => openEdit(p)}>
                                <Edit sx={{ color: '#D4AF37', fontSize: 18 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </>
          )}
        </>
      )}

      {/* Edit dialog — crew/infra + bankability, honest nulls throughout */}
      <Dialog
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditing(null); setForm({}); }}
        maxWidth="md"
        fullWidth
        fullScreen={fullScreen}
        PaperProps={{ sx: { bgcolor: '#0a0a0a', border: '1px solid rgba(212, 175, 55, 0.2)' } }}
      >
        <DialogTitle sx={{ color: '#D4AF37', fontWeight: 600 }}>
          Edit Profile — {editing?.territory}
        </DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Typography variant="subtitle2" sx={{ color: '#D4AF37', mt: 1, mb: 1 }}>Crew depth</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth size="small" label="Tier (blank = not curated)"
                value={form.crewDepthTier || ''}
                onChange={(e) => setForm({ ...form, crewDepthTier: e.target.value || null })}>
                <MenuItem value="">Not curated</MenuItem>
                {TIER_OPTIONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Score (0–100)" type="number"
                value={form.crewDepthScore ?? ''}
                onChange={(e) => setForm({ ...form, crewDepthScore: numField(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" multiline minRows={2} label="Crew notes (named-production evidence)"
                value={form.crewDepthNotes || ''}
                onChange={(e) => setForm({ ...form, crewDepthNotes: e.target.value })} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ color: '#4f83cc', mt: 2, mb: 1 }}>Infrastructure</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField select fullWidth size="small" label="Tier (blank = not curated)"
                value={form.infrastructureTier || ''}
                onChange={(e) => setForm({ ...form, infrastructureTier: e.target.value || null })}>
                <MenuItem value="">Not curated</MenuItem>
                {TIER_OPTIONS.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField fullWidth size="small" label="Score (0–100)" type="number"
                value={form.infrastructureScore ?? ''}
                onChange={(e) => setForm({ ...form, infrastructureScore: numField(e.target.value) })} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" multiline minRows={2} label="Infrastructure notes"
                value={form.infrastructureNotes || ''}
                onChange={(e) => setForm({ ...form, infrastructureNotes: e.target.value })} />
            </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{ color: '#66bb6a', mt: 2, mb: 1 }}>Bankability — verified windows (weeks)</Typography>
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
                <MenuItem value="">—</MenuItem>
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
                  onChange={(e) => setForm({ ...form, bankabilitySuspended: e.target.checked })}
                  sx={{ color: '#f44336' }} />}
                label="Programme suspended (confirmed — renders Not Bankable as a sourced fact)" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Checkbox checked={form.bankabilityRealWorldConfirms === true}
                  indeterminate={form.bankabilityRealWorldConfirms == null}
                  onChange={(e) => setForm({ ...form, bankabilityRealWorldConfirms: e.target.checked })}
                  sx={{ color: '#D4AF37' }} />}
                label="Real-world evidence confirms the stated timing (indeterminate = unconfirmed)" />
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
        <DialogActions sx={{ p: 2, position: 'sticky', bottom: 0, bgcolor: '#0a0a0a', borderTop: '1px solid rgba(212,175,55,0.25)' }}>
          <Button onClick={() => { setEditOpen(false); setEditing(null); setForm({}); }} sx={{ color: '#a0a0a0' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave}
            sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 700, '&:hover': { bgcolor: '#B8941F' } }}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
