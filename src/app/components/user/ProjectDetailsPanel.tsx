import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { ProjectDetails, RevenueScenario, updateProjectDetails, draftProjectDetailsCopy, ApiError } from '../../../services/api';
import { AutoAwesome } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

interface Props {
  reportId: string;
  initialData: ProjectDetails | null;
  onSaved: (updated: ProjectDetails) => void;
}

const EMPTY_SCENARIO: RevenueScenario = {
  theatrical_domestic: '',
  theatrical_international: '',
  svod: '',
  tv_broadcast: '',
  ancillary: '',
};

const REVENUE_STREAMS: { key: keyof RevenueScenario; label: string }[] = [
  { key: 'theatrical_domestic', label: 'Theatrical (Domestic)' },
  { key: 'theatrical_international', label: 'Theatrical (Intl)' },
  { key: 'svod', label: 'SVOD / Streaming' },
  { key: 'tv_broadcast', label: 'TV Broadcast' },
  { key: 'ancillary', label: 'Ancillary' },
];

/** Theme-aware field styling.
 *
 * These were hardcoded to white text on a transparent field with #666 labels,
 * written when this panel only ever appeared on a dark background. In light mode
 * the text was white on white and simply could not be read; in dark mode #666
 * labels sat barely above the background. Nothing here should be a literal colour:
 * the token set already answers both themes. */
const makeFieldSx = (t: ReturnType<typeof tokens>) => ({
  '& .MuiOutlinedInput-root': {
    color: t.textPrimary,
    '& fieldset': { borderColor: t.border },
    '&:hover fieldset': { borderColor: t.textFaint },
    '&.Mui-focused fieldset': { borderColor: t.gold },
  },
  '& .MuiInputLabel-root': { color: t.textSecondary },
  '& .MuiInputLabel-root.Mui-focused': { color: t.gold },
  '& .MuiInputBase-input::placeholder': { color: t.textFaint, opacity: 1 },
});

function sectionLabel(text: string, gold: string) {
  return (
    <Typography
      variant="overline"
      sx={{ fontSize: '0.65rem', color: gold, letterSpacing: '0.1em', display: 'block', mb: 1.5, mt: 2.5 }}
    >
      {text}
    </Typography>
  );
}

export default function ProjectDetailsPanel({ reportId, initialData, onSaved }: Props) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const fieldSx = makeFieldSx(t);
  const [drafting, setDrafting] = useState(false);

  /** Fill the two prose fields from the analysis this report already holds.
   *
   * Only fills what is empty. Overwriting words a producer has already written is
   * the one thing an assistant like this must never do, and "it replaced my
   * logline" is not recoverable from inside a form. */
  const draftCopy = async () => {
    if (drafting) return;
    setDrafting(true);
    try {
      const draft = await draftProjectDetailsCopy(reportId);
      const filled: string[] = [];
      if (draft.logline && !(form.logline ?? '').trim()) {
        setField('logline', draft.logline);
        filled.push('logline');
      }
      if (draft.synopsis && !(form.synopsis ?? '').trim()) {
        setField('synopsis', draft.synopsis);
        filled.push('synopsis');
      }
      if (filled.length === 0) {
        enqueueSnackbar('Clear a field first — drafting never overwrites your own words.', { variant: 'info' });
      } else {
        enqueueSnackbar(`Drafted your ${filled.join(' and ')}. Edit before saving.`, { variant: 'success' });
      }
    } catch (error) {
      enqueueSnackbar(
        error instanceof ApiError ? error.message : 'Could not draft from this report.',
        { variant: 'error' },
      );
    } finally {
      setDrafting(false);
    }
  };
  const { enqueueSnackbar } = useSnackbar();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const [form, setForm] = useState<ProjectDetails>(initialData ?? {});

  const [revenueModel, setRevenueModel] = useState<{
    low: RevenueScenario;
    base: RevenueScenario;
    high: RevenueScenario;
  }>(
    initialData?.revenue_model
      ? {
          low: { ...EMPTY_SCENARIO, ...initialData.revenue_model.low },
          base: { ...EMPTY_SCENARIO, ...initialData.revenue_model.base },
          high: { ...EMPTY_SCENARIO, ...initialData.revenue_model.high },
        }
      : { low: { ...EMPTY_SCENARIO }, base: { ...EMPTY_SCENARIO }, high: { ...EMPTY_SCENARIO } },
  );

  const [waterfall, setWaterfall] = useState(
    initialData?.waterfall ?? {
      distribution_fee_pct: '',
      sales_agent_commission_pct: '',
      pa_budget: '',
      investor_equity_pct: '',
      preferred_return_pct: '',
      investor_net_profit_split_pct: '',
      producer_net_profit_split_pct: '',
    },
  );

  const setField = (key: keyof ProjectDetails, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setScenarioField = (scenario: 'low' | 'base' | 'high', key: keyof RevenueScenario, value: string) =>
    setRevenueModel((prev) => ({ ...prev, [scenario]: { ...prev[scenario], [key]: value } }));

  const setWaterfallField = (key: string, value: string) =>
    setWaterfall((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload: ProjectDetails = { ...form, revenue_model: revenueModel, waterfall };
      await updateProjectDetails(reportId, payload);
      setLastSaved(new Date());
      onSaved(payload);
      enqueueSnackbar('Project details saved', { variant: 'success' });
    } catch {
      enqueueSnackbar('Failed to save project details', { variant: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Box>
      {sectionLabel('Creative Team', t.gold)}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Director Name" value={form.director_name ?? ''} onChange={(e) => setField('director_name', e.target.value)} sx={fieldSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Producer Name" value={form.producer_name ?? ''} onChange={(e) => setField('producer_name', e.target.value)} sx={fieldSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" multiline minRows={2} label="Director Bio" placeholder="2 to 3 sentences" value={form.director_bio ?? ''} onChange={(e) => setField('director_bio', e.target.value)} sx={fieldSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" multiline minRows={2} label="Producer Bio" placeholder="2 to 3 sentences" value={form.producer_bio ?? ''} onChange={(e) => setField('producer_bio', e.target.value)} sx={fieldSx} />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
        {sectionLabel('Script', t.gold)}
        <Button
          size="small"
          onClick={draftCopy}
          disabled={drafting}
          startIcon={drafting ? <CircularProgress size={14} color="inherit" /> : <AutoAwesome sx={{ fontSize: 16 }} />}
          sx={{ textTransform: 'none', fontSize: '0.78rem', fontWeight: 600, color: t.gold, mt: 1.5 }}
        >
          {drafting ? 'Drafting...' : 'Draft with AI'}
        </Button>
      </Box>
      <Typography sx={{ color: t.textFaint, fontSize: '0.72rem', mb: 1.5, lineHeight: 1.5 }}>
        Drafts a logline and synopsis from this report's own story analysis, for you
        to edit. It only fills fields you have left empty, and never invents plot the
        analysis does not describe.
      </Typography>
      <Grid container spacing={2}>
        <Grid size={12}>
          <TextField fullWidth size="small" label="Logline" placeholder="One sentence describing the story" value={form.logline ?? ''} onChange={(e) => setField('logline', e.target.value)} sx={fieldSx} />
        </Grid>
        <Grid size={12}>
          <TextField fullWidth size="small" multiline minRows={3} label="Synopsis" placeholder="2 to 3 sentences" value={form.synopsis ?? ''} onChange={(e) => setField('synopsis', e.target.value)} sx={fieldSx} />
        </Grid>
      </Grid>

      {sectionLabel('Finance Overview', t.gold)}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth size="small" label="Equity Sought" placeholder="e.g. £2,500,000" value={form.equity_sought ?? ''} onChange={(e) => setField('equity_sought', e.target.value)} sx={fieldSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth size="small" label="Equity Committed" placeholder="e.g. 40%" value={form.equity_committed_pct ?? ''} onChange={(e) => setField('equity_committed_pct', e.target.value)} sx={fieldSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth size="small" label="Minimum Investment" placeholder="e.g. £25,000" value={form.minimum_investment ?? ''} onChange={(e) => setField('minimum_investment', e.target.value)} sx={fieldSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Preferred Return" placeholder="e.g. 15%" value={form.preferred_return ?? ''} onChange={(e) => setField('preferred_return', e.target.value)} sx={fieldSx} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth size="small" label="Investor Profit Share" placeholder="e.g. 50%" value={form.investor_profit_share ?? ''} onChange={(e) => setField('investor_profit_share', e.target.value)} sx={fieldSx} />
        </Grid>
      </Grid>

      {sectionLabel('Revenue Model, Three Scenarios', t.gold)}
      <Box sx={{ overflowX: 'auto' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr 1fr', gap: 1, minWidth: 480 }}>
          <Box />
          {(['Low', 'Base', 'High'] as const).map((scenario) => (
            <Typography key={scenario} variant="overline" sx={{ fontSize: '0.62rem', textAlign: 'center', color: t.gold, letterSpacing: '0.1em' }}>
              {scenario}
            </Typography>
          ))}
          {REVENUE_STREAMS.map(({ key, label }) => (
            <React.Fragment key={key}>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', color: t.textSecondary, alignSelf: 'center' }}>
                {label}
              </Typography>
              {(['low', 'base', 'high'] as const).map((scenario) => (
                <TextField
                  key={scenario}
                  size="small"
                  placeholder="£0"
                  slotProps={{ input: { style: { fontSize: '0.78rem', textAlign: 'right', color: t.textPrimary } } }}
                  value={revenueModel[scenario][key] ?? ''}
                  onChange={(e) => setScenarioField(scenario, key, e.target.value)}
                  sx={fieldSx}
                />
              ))}
            </React.Fragment>
          ))}
        </Box>
      </Box>

      {sectionLabel('Recoupment Waterfall', t.gold)}
      <Grid container spacing={2}>
        {[
          { key: 'distribution_fee_pct', label: 'Distribution Fee', placeholder: 'e.g. 25%' },
          { key: 'sales_agent_commission_pct', label: 'Sales Agent Commission', placeholder: 'e.g. 10%' },
          { key: 'pa_budget', label: 'P&A Budget', placeholder: 'e.g. £500,000' },
          { key: 'investor_equity_pct', label: 'Investor Equity', placeholder: 'e.g. 70%' },
          { key: 'preferred_return_pct', label: 'Preferred Return', placeholder: 'e.g. 15%' },
          { key: 'investor_net_profit_split_pct', label: 'Investor Net Profit Split', placeholder: 'e.g. 50%' },
          { key: 'producer_net_profit_split_pct', label: 'Producer Net Profit Split', placeholder: 'e.g. 50%' },
        ].map(({ key, label, placeholder }) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={key}>
            <TextField
              fullWidth
              size="small"
              label={label}
              placeholder={placeholder}
              value={(waterfall as Record<string, string>)[key] ?? ''}
              onChange={(e) => setWaterfallField(key, e.target.value)}
              sx={fieldSx}
            />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 3 }}>
        <Button
          variant="contained"
          size="small"
          onClick={handleSave}
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={14} color="inherit" /> : undefined}
          sx={{ bgcolor: t.gold, color: mode === 'dark' ? '#000' : '#fff', '&:hover': { bgcolor: t.goldDim }, textTransform: 'none', fontSize: '0.85rem', fontWeight: 600, px: 3 }}
        >
          {isSaving ? 'Saving…' : 'Save Details'}
        </Button>
        {lastSaved && (
          <Typography variant="body2" sx={{ fontSize: '0.72rem', color: '#4caf50' }}>
            ✓ Saved at {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
