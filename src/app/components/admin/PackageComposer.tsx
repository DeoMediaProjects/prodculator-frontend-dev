import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  Alert, Box, Button, Card, Checkbox, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider,
  IconButton, LinearProgress, MenuItem, Stack, Step, StepButton, Stepper,
  TextField, Tooltip, Typography,
} from '@mui/material';
import {
  BookmarkAdd, DeleteOutline, PictureAsPdf, Refresh, RestartAlt,
} from '@mui/icons-material';
import {
  adminB2BService,
  type B2BSubscription,
  type PackagePreview,
  type PackagePreviewSection,
  type PackageSection,
  type SavedPackageTemplate,
} from '@/services/b2b.service';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';

const STANDARD_PRODUCTS = [
  { value: 'camera_equipment', label: 'Camera & Equipment' },
  { value: 'production_services', label: 'Production Services' },
  { value: 'crew_casting', label: 'Crew & Casting' },
  { value: 'production_trend', label: 'Production Trend' },
  { value: 'enterprise', label: 'Enterprise Slate' },
];

const PART_LABEL: Record<string, string> = {
  context: 'Part A, Curated market context',
  signals: 'Part B, Platform demand signals',
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Status -> how it reads and how alarming it is. `blocked_exclusive` is the
 *  only one that is contractual rather than statistical. */
function statusChip(section: PackagePreviewSection) {
  switch (section.status) {
    case 'ok':
      return { label: 'Will render', color: 'success' as const };
    case 'below_threshold':
      return { label: 'Below segment floor', color: 'warning' as const };
    case 'insufficient_overall':
      return { label: 'Period too small', color: 'warning' as const };
    case 'empty_dataset':
      return { label: 'No data in dataset', color: 'default' as const };
    case 'blocked_exclusive':
      return { label: 'Locked to another client', color: 'error' as const };
    default:
      return { label: 'Unknown section', color: 'default' as const };
  }
}

const WIZARD_STEPS = ['Client and period', 'Sections', 'Sufficiency', 'Generate'] as const;

/** Why Continue is disabled, so a blocked step explains itself. */
const BLOCKED_REASONS: Record<number, string> = {
  0: 'Set a period start and end first.',
  1: 'Choose at least one section.',
  2: 'Run the sufficiency preview and get at least one renderable section before generating.',
  3: '',
};

const STEP_HINTS: Record<number, string> = {
  0: 'Choose who the package is for and the period it covers. Exclusivity is scoped to the client, so this decides which sections are even available.',
  1: 'Pick the sections, or load a saved layout. Curated market context and aggregated platform signals can be mixed freely.',
  2: 'Check the data supports what you have chosen. This applies the same privacy floors the renderer does, so what it says here is what the PDF will contain.',
  3: 'Generate and deliver. Only sections marked renderable above will appear.',
};

export function PackageComposer() {
  const { enqueueSnackbar } = useSnackbar();

  const [library, setLibrary] = useState<PackageSection[]>([]);
  const [templates, setTemplates] = useState<SavedPackageTemplate[]>([]);
  const [subscriptions, setSubscriptions] = useState<B2BSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Selection order is the render order, so this stays an array, not a Set.
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('Bespoke Intelligence Package');
  const [subscriptionId, setSubscriptionId] = useState<string>('');
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    d.setDate(1);
    return isoDate(d);
  });
  const [periodEnd, setPeriodEnd] = useState(() => isoDate(new Date()));

  const [preview, setPreview] = useState<PackagePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const [saveOpen, setSaveOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [saving, setSaving] = useState(false);

  // Composing a package is a sequence: who and when, then what goes in it,
  // then whether the data actually supports it, then generate. Presented as one
  // dense screen it read as a settings panel, and the sufficiency check (the
  // step that decides whether the PDF is worth sending) was easy to skip.
  const [step, setStep] = useState(0);

  // What each step needs before the next one opens. The sufficiency step is the
  // point of the flow, so Generate stays shut until a preview has actually run
  // and returned at least one renderable section.
  const stepSatisfied = [
    Boolean(periodStart && periodEnd),
    selected.length > 0,
    Boolean(preview && preview.renderable_sections > 0),
    true,
  ];
  const furthestReachable = stepSatisfied.reduce(
    (reached, ok, i) => (i <= reached && ok ? i + 1 : reached),
    0,
  );



  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [lib, tpl, subs] = await Promise.all([
        adminB2BService.getSectionLibrary(),
        adminB2BService.getSavedTemplates(),
        adminB2BService.getSubscriptions().catch(() => [] as B2BSubscription[]),
      ]);
      setLibrary(lib);
      setTemplates(tpl);
      setSubscriptions(subs);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load the section library');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadAll(); }, [loadAll]);

  const grouped = useMemo(() => {
    const byPart: Record<string, Record<string, PackageSection[]>> = {};
    for (const s of library) {
      byPart[s.part] ??= {};
      byPart[s.part][s.group] ??= [];
      byPart[s.part][s.group].push(s);
    }
    return byPart;
  }, [library]);

  const previewByKey = useMemo(() => {
    const map: Record<string, PackagePreviewSection> = {};
    for (const s of preview?.sections ?? []) map[s.key] = s;
    return map;
  }, [preview]);

  const toggle = (key: string) => {
    setSelected((cur) => (cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]));
  };

  const runPreview = useCallback(async () => {
    if (selected.length === 0) { setPreview(null); return; }
    setPreviewing(true);
    setPreviewError(null);
    try {
      setPreview(await adminB2BService.previewPackage({
        section_keys: selected,
        period_start: periodStart,
        period_end: periodEnd,
        subscription_id: subscriptionId || null,
      }));
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Preview failed');
      setPreview(null);
    } finally {
      setPreviewing(false);
    }
  }, [selected, periodStart, periodEnd, subscriptionId]);

  // Live sufficiency: debounced so dragging through the library does not fire a
  // request per click.
  useEffect(() => {
    const id = setTimeout(() => { void runPreview(); }, 400);
    return () => clearTimeout(id);
  }, [runPreview]);

  const loadTemplate = async (tpl: SavedPackageTemplate) => {
    const known = tpl.section_keys.filter((k) => library.some((s) => s.key === k));
    setSelected(known);
    setTitle(tpl.name);
    if (tpl.unknown_section_keys?.length) {
      enqueueSnackbar(
        `${tpl.unknown_section_keys.length} section(s) in this template no longer exist and were skipped`,
        { variant: 'warning' },
      );
    }
  };

  const loadProductTemplate = async (productType: string) => {
    try {
      const res = await adminB2BService.getProductTemplate(productType);
      setSelected(res.section_keys.filter((k) => library.some((s) => s.key === k)));
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Could not load that product layout', { variant: 'error' });
    }
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      await adminB2BService.saveTemplate({
        name: templateName,
        section_keys: selected,
        description: templateDesc || null,
      });
      enqueueSnackbar('Template saved', { variant: 'success' });
      setSaveOpen(false);
      setTemplateName('');
      setTemplateDesc('');
      setTemplates(await adminB2BService.getSavedTemplates());
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (tpl: SavedPackageTemplate) => {
    if (!window.confirm(`Delete the template "${tpl.name}"?`)) return;
    try {
      await adminB2BService.deleteTemplate(tpl.id);
      setTemplates((cur) => cur.filter((t) => t.id !== tpl.id));
      enqueueSnackbar('Template deleted', { variant: 'success' });
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Delete failed', { variant: 'error' });
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await adminB2BService.generatePackage({
        section_keys: selected,
        period_start: periodStart,
        period_end: periodEnd,
        title,
        subscription_id: subscriptionId || null,
        deliver: false,
      });
      enqueueSnackbar(
        `Package generated (${res.status}). Find it under Clients, then Requests to download or send.`,
        { variant: 'success', autoHideDuration: 8000 },
      );
    } catch (err) {
      enqueueSnackbar(err instanceof Error ? err.message : 'Generation failed', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const blocked = preview?.sections.filter((s) => s.status === 'blocked_exclusive') ?? [];
  const canGenerate =
    selected.length > 0 && !!title.trim() && blocked.length === 0
    && (preview?.renderable_sections ?? 0) > 0 && !generating;

  if (loading) return <LoadingSpinner />;

  const wizardNav = (
    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 2 }}>
      <Button disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
        Back
      </Button>
      <Box sx={{ flex: 1 }} />
      {step < WIZARD_STEPS.length - 1 && (
        <Tooltip title={stepSatisfied[step] ? '' : BLOCKED_REASONS[step]}>
          <span>
            <Button
              variant="contained"
              disabled={!stepSatisfied[step]}
              onClick={() => {
                // Entering the sufficiency step runs the check rather than
                // leaving the admin to notice a refresh button.
                if (step === 1 && !preview) void runPreview();
                setStep((s) => s + 1);
              }}
            >
              Continue
            </Button>
          </span>
        </Tooltip>
      )}
    </Stack>
  );

  return (
    <Box>
      <Stepper activeStep={step} sx={{ mb: 3 }}>
        {WIZARD_STEPS.map((label, i) => (
          <Step key={label} completed={step > i}>
            <StepButton onClick={() => setStep(i)} disabled={i > furthestReachable}>
              {label}
            </StepButton>
          </Step>
        ))}
      </Stepper>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {STEP_HINTS[step]}
      </Typography>

      {loadError && <Alert severity="error" sx={{ mb: 2 }}>{loadError}</Alert>}

      {step === 0 && (
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <TextField
            label="Package title" size="small" value={title}
            onChange={(e) => setTitle(e.target.value)} sx={{ minWidth: 260, flex: '1 1 260px' }}
          />
          <TextField
            label="Period start" type="date" size="small" value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Period end" type="date" size="small" value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Tooltip title="Scopes the exclusivity check. Without a client, any section held exclusively by someone else is blocked.">
            <TextField
              select label="For client" size="small" value={subscriptionId}
              onChange={(e) => setSubscriptionId(e.target.value)}
              sx={{ minWidth: 220 }}
            >
              <MenuItem value="">Internal / no client</MenuItem>
              {subscriptions.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.product_type} · {s.id.slice(0, 8)}
                </MenuItem>
              ))}
            </TextField>
          </Tooltip>
        </Stack>
      </Card>
      )}

      {step >= 1 && (
      <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="flex-start">
        {/* Section picker */}
        <Card sx={{ p: 2, flex: '1 1 60%', width: '100%' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Sections ({selected.length} selected)
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                select size="small" label="Start from" value="" sx={{ minWidth: 170 }}
                onChange={(e) => void loadProductTemplate(e.target.value)}
              >
                {STANDARD_PRODUCTS.map((p) => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </TextField>
              <Tooltip title="Clear selection">
                <span>
                  <IconButton size="small" onClick={() => setSelected([])} disabled={!selected.length}>
                    <RestartAlt />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Stack>

          {Object.entries(grouped).map(([part, groups]) => (
            <Box key={part} sx={{ mb: 2 }}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 700 }}>
                {PART_LABEL[part] ?? part}
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {Object.entries(groups).map(([group, sections]) => (
                <Box key={group} sx={{ mb: 1.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                    {group}
                  </Typography>
                  {sections.map((s) => {
                    const pv = previewByKey[s.key];
                    const isSelected = selected.includes(s.key);
                    return (
                      <Box key={s.key} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Checkbox
                          size="small" checked={isSelected}
                          onChange={() => toggle(s.key)} sx={{ mt: 0.25 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0, py: 0.5 }}>
                          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                            <Typography variant="body2" sx={{ fontWeight: isSelected ? 700 : 400 }}>
                              {s.title}
                            </Typography>
                            {isSelected && pv && (
                              <Chip size="small" {...statusChip(pv)} variant="outlined" />
                            )}
                          </Stack>
                          {s.note && (
                            <Typography variant="caption" color="text.secondary">{s.note}</Typography>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              ))}
            </Box>
          ))}
        </Card>

        {/* Sufficiency preview */}
        {step >= 2 && (
        <Card sx={{ p: 2, flex: '1 1 40%', width: '100%', position: { lg: 'sticky' }, top: 16 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Sufficiency preview</Typography>
            <IconButton size="small" onClick={() => void runPreview()} disabled={previewing}>
              <Refresh />
            </IconButton>
          </Stack>
          {previewing && <LinearProgress sx={{ my: 1 }} />}
          {previewError && <Alert severity="error" sx={{ mt: 1 }}>{previewError}</Alert>}

          {!preview && !previewing && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Select at least one section to see what would render.
            </Typography>
          )}

          {preview && (
            <>
              <Stack spacing={0.5} sx={{ mt: 1.5, mb: 2 }}>
                <Typography variant="body2">
                  <strong>{preview.signal_count}</strong> signals in period
                  {!preview.overall_threshold_met && (
                    <Chip size="small" color="warning" variant="outlined" label="below floor" sx={{ ml: 1 }} />
                  )}
                </Typography>
                <Typography variant="body2">
                  <strong>{preview.renderable_sections}</strong> of {preview.sections.length} sections will render
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Floors: {preview.thresholds.minimum_overall_records} records overall,{' '}
                  {preview.thresholds.minimum_segment_records} per segment. These are not
                  overridable.
                </Typography>
              </Stack>

              {blocked.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {blocked.length} section(s) are licensed exclusively to another client
                  and cannot be included. Remove them, or pick the client who holds them.
                </Alert>
              )}

              <Stack spacing={1}>
                {preview.sections.map((s) => (
                  <Box key={s.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 0 }}>
                      {s.title ?? s.key}
                      {s.part === 'signals' && s.qualifying_segments !== undefined && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {' '}· {s.qualifying_segments} segment(s)
                          {!!s.suppressed_segments && `, ${s.suppressed_segments} suppressed`}
                        </Typography>
                      )}
                      {s.part === 'context' && s.record_count !== undefined && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {' '}· {s.record_count} records
                        </Typography>
                      )}
                    </Typography>
                    <Chip size="small" {...statusChip(s)} variant="outlined" sx={{ flexShrink: 0 }} />
                  </Box>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                <Button
                  variant="contained" startIcon={generating ? <CircularProgress size={16} /> : <PictureAsPdf />}
                  disabled={!canGenerate} onClick={() => void generate()}
                >
                  {generating ? 'Generating...' : 'Generate PDF'}
                </Button>
                <Button
                  startIcon={<BookmarkAdd />} disabled={!selected.length}
                  onClick={() => { setTemplateName(title); setSaveOpen(true); }}
                >
                  Save as template
                </Button>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Generating does not email the client. Send it from Clients, then Requests.
              </Typography>
            </>
          )}
        </Card>
        )}
      </Stack>
      )}

      {step === 1 && (
      <Card sx={{ p: 2, mt: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Saved templates</Typography>
        {templates.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            None yet. Compose a package and save it to reuse the layout.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {templates.map((tpl) => (
              <Box key={tpl.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{tpl.name}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {tpl.section_keys.length} section(s)
                    {!!tpl.unknown_section_keys?.length && ` · ${tpl.unknown_section_keys.length} no longer available`}
                    {tpl.description ? ` · ${tpl.description}` : ''}
                  </Typography>
                </Box>
                <Button size="small" onClick={() => void loadTemplate(tpl)}>Load</Button>
                <IconButton size="small" onClick={() => void deleteTemplate(tpl)}>
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
      </Card>
      )}

      {wizardNav}

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Save composition as template</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Template name" value={templateName} fullWidth
              onChange={(e) => setTemplateName(e.target.value)}
              helperText="Names are unique, so this will not overwrite a colleague's template."
            />
            <TextField
              label="Description (optional)" value={templateDesc} fullWidth multiline rows={2}
              onChange={(e) => setTemplateDesc(e.target.value)}
            />
            <Typography variant="caption" color="text.secondary">
              Saving {selected.length} section(s), in the order selected.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={!templateName.trim() || saving} onClick={() => void saveTemplate()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
