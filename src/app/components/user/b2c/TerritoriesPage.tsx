import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  Box, Typography, Button, Select, MenuItem, IconButton, CircularProgress, FormControl,
} from '@mui/material';
import { FileDownloadOutlined, Close, InfoOutlined } from '@mui/icons-material';
import {
  fetchTerritoryList, compareTerritories,
  type TerritoryListItem, type TerritoryCompareItem,
} from '@/services/territory.service';
import { usePlanGate } from '@/app/hooks/usePlanGate';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useHeaderActions } from './headerActions';

const FLAG_FALLBACK = '\u{1F3AC}';
function isoToFlag(iso: string | null): string {
  if (!iso || iso.length !== 2) return FLAG_FALLBACK;
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 - 65 + c.charCodeAt(0)));
}
function groupByCountry(list: TerritoryListItem[]): Record<string, TerritoryListItem[]> {
  const groups: Record<string, TerritoryListItem[]> = {};
  for (const t of list) if (!t.parent) groups[t.label] = groups[t.label] || [];
  for (const t of list) if (t.parent) { groups[t.parent] = groups[t.parent] || []; groups[t.parent].push(t); }
  for (const t of list) if (!t.parent && !groups[t.label]?.length) groups[t.label] = [t];
  return groups;
}

export function TerritoriesPage() {
  const { hasAccess } = usePlanGate('professional');
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const [available, setAvailable] = useState<TerritoryListItem[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [compared, setCompared] = useState<TerritoryCompareItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await fetchTerritoryList();
      if (data) {
        const list = data.territories ?? [];
        setAvailable(list);
        setSelectedLabels(list.filter((x) => !x.parent).slice(0, 2).map((x) => x.label));
      }
    })();
  }, []);

  const fetchComparison = useCallback(async () => {
    if (!hasAccess || !selectedLabels.length) { setCompared([]); return; }
    setLoading(true);
    const { data } = await compareTerritories(selectedLabels);
    setCompared(data?.territories ?? []);
    setLoading(false);
  }, [selectedLabels, hasAccess]);
  useEffect(() => { fetchComparison(); }, [fetchComparison]);

  const addTerritory = (label: string) => {
    if (label && selectedLabels.length < 4 && !selectedLabels.includes(label)) setSelectedLabels([...selectedLabels, label]);
  };
  const removeTerritory = (label: string) => {
    if (selectedLabels.length > 1) setSelectedLabels(selectedLabels.filter((l) => l !== label));
  };

  const exportCSV = () => {
    if (!compared.length) return;
    const header = ['Criteria', ...compared.map((c) => c.label)];
    const line = (label: string, vals: string[]) => [label, ...vals];
    const rows = [
      line('Tax Rebate', compared.map((c) => c.incentive?.tax_rebate || 'N/A')),
      line('Programme', compared.map((c) => c.incentive?.programme || 'N/A')),
      line('Post Production / VFX Bonus', compared.map((c) => c.incentive?.post_production_bonus || 'N/A')),
      line('Minimum Spend', compared.map((c) => c.incentive?.min_spend || 'N/A')),
      line('Rebate Cap', compared.map((c) => c.incentive?.cap_display || 'N/A')),
      line('Payment Timeline', compared.map((c) => c.incentive?.payment_timeline || 'N/A')),
      line('Labor Requirement', compared.map((c) => c.labor_requirement || 'No specific requirement')),
      line('Highlights', compared.map((c) => c.highlights.join('; '))),
      line('Restrictions', compared.map((c) => c.restrictions.join('; '))),
      line('Data Last Verified', compared.map((c) => c.incentive?.last_verified || 'N/A')),
    ];
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = `territory-comparison.csv`; a.click(); URL.revokeObjectURL(url);
  };

  const grouped = groupByCountry(available);
  const availableToAdd = available.filter((x) => !selectedLabels.includes(x.label));
  const cols = `minmax(200px, 260px) repeat(${compared.length || 1}, minmax(220px, 1fr))`;
  const card = { bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '16px' };

  // Row definitions (label + per-territory renderer)
  const rows: { label: string; render: (c: TerritoryCompareItem) => ReactNode }[] = [
    { label: 'Tax Rebate', render: (c) => <Typography sx={{ color: t.success, fontWeight: 800, fontSize: 16 }}>{c.incentive?.tax_rebate || 'N/A'}</Typography> },
    { label: 'Programme', render: (c) => <Typography sx={{ color: t.textPrimary }}>{c.incentive?.programme || 'N/A'}</Typography> },
    { label: 'Post Production / VFX Bonus', render: (c) => <Typography sx={{ color: c.incentive?.post_production_bonus ? t.success : t.textSecondary }}>{c.incentive?.post_production_bonus || 'N/A'}</Typography> },
    { label: 'Minimum Spend', render: (c) => <Typography sx={{ color: t.textPrimary }}>{c.incentive?.min_spend || 'No minimum'}</Typography> },
    { label: 'Rebate Cap', render: (c) => <Typography sx={{ color: t.textPrimary }}>{c.incentive?.cap_display || 'No cap identified'}</Typography> },
    { label: 'Payment Timeline', render: (c) => <Typography sx={{ color: c.incentive?.payment_timeline ? t.textPrimary : t.textSecondary }}>{c.incentive?.payment_timeline || 'N/A'}</Typography> },
    { label: 'Labor Requirement', render: (c) => <Typography sx={{ color: t.textPrimary }}>{c.labor_requirement || 'No specific requirement'}</Typography> },
    { label: 'Highlights', render: (c) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {c.highlights.length ? c.highlights.map((h, i) => <Typography key={i} sx={{ color: t.success, fontSize: 13.5 }}>✓ {h}</Typography>) : <Typography sx={{ color: t.textSecondary }}>N/A</Typography>}
      </Box>
    ) },
    { label: 'Restrictions', render: (c) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {c.restrictions.length ? c.restrictions.map((r, i) => <Typography key={i} sx={{ color: t.warning, fontSize: 13.5 }}>⚠ {r}</Typography>) : <Typography sx={{ color: t.textSecondary }}>N/A</Typography>}
      </Box>
    ) },
    { label: 'Data Last Verified', render: (c) => <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>{c.incentive?.last_verified || 'N/A'}</Typography> },
  ];

  // Action button lives in the dashboard top bar next to "New Analysis".
  useHeaderActions(
    <Button variant="outlined" startIcon={<FileDownloadOutlined />} onClick={exportCSV} disabled={!compared.length} sx={{ whiteSpace: 'nowrap' }}>
      Export CSV
    </Button>,
    [compared.length],
  );

  return (
    <Box>
      {/* Controls bar — the "Territory Comparison" title + description now live
          in the dashboard top bar, so we only keep the actions here. */}
      <Box sx={{ ...card, p: 2, mb: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
        <Typography sx={{ color: t.textSecondary, fontSize: 13, whiteSpace: 'nowrap' }}>{availableToAdd.length} available territories</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <Select
              displayEmpty value="" onChange={(e) => addTerritory(e.target.value as string)}
              disabled={selectedLabels.length >= 4}
              renderValue={() => <span style={{ color: t.textSecondary }}>Add Territory</span>}
              MenuProps={{ PaperProps: { sx: { maxHeight: 360, bgcolor: t.cardBg } } }}
            >
              {Object.entries(grouped).flatMap(([country, items]) => {
                const addable = items.filter((it) => availableToAdd.some((a) => a.label === it.label));
                if (!addable.length) return [];
                return [
                  <MenuItem key={`h-${country}`} disabled sx={{ color: t.gold, fontWeight: 700, opacity: '1 !important' }}>{country}</MenuItem>,
                  ...addable.map((it) => <MenuItem key={it.label} value={it.label} sx={{ pl: 3, color: t.textPrimary }}>{it.label}</MenuItem>),
                ];
              })}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Comparison table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress sx={{ color: t.gold }} /></Box>
      ) : compared.length > 0 ? (
        <Box sx={{ ...card, overflow: 'hidden' }}>
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 620 }}>
              {/* header row */}
              <Box sx={{ display: 'grid', gridTemplateColumns: cols, bgcolor: t.goldDim, px: 2.5, py: 2, alignItems: 'center' }}>
                <Typography sx={{ color: t.gold, fontWeight: 800, fontSize: 12, letterSpacing: '0.1em' }}>CRITERIA</Typography>
                {compared.map((c) => (
                  <Box key={c.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: 18 }}>{isoToFlag(c.iso)}</Typography>
                    <Typography sx={{ color: t.gold, fontWeight: 800, fontSize: 15 }}>{c.label}</Typography>
                    {selectedLabels.length > 1 && (
                      <IconButton size="small" onClick={() => removeTerritory(c.label)} sx={{ color: t.textSecondary, '&:hover': { color: t.gold } }}><Close sx={{ fontSize: 15 }} /></IconButton>
                    )}
                  </Box>
                ))}
              </Box>
              {/* data rows */}
              {rows.map((row, ri) => (
                <Box key={row.label} sx={{ display: 'grid', gridTemplateColumns: cols, px: 2.5, py: 1.75, borderTop: `1px solid ${t.borderSoft}`, bgcolor: ri % 2 ? (mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(0,0,0,0.015)') : 'transparent' }}>
                  <Typography sx={{ color: t.textPrimary, fontWeight: 700, pr: 2 }}>{row.label}</Typography>
                  {compared.map((c) => <Box key={c.label} sx={{ pr: 2 }}>{row.render(c)}</Box>)}
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={{ ...card, p: 6, textAlign: 'center' }}>
          <Typography sx={{ color: t.textSecondary }}>Select territories from the dropdown to compare them side by side.</Typography>
        </Box>
      )}

      {/* Disclaimer */}
      {compared.length > 0 && (
        <Box sx={{ mt: 2.5, display: 'flex', gap: 1.25, alignItems: 'flex-start', bgcolor: t.cardBg, border: `1px solid ${t.border}`, borderRadius: '12px', p: 2 }}>
          <InfoOutlined sx={{ color: t.textSecondary, fontSize: 18, mt: 0.25 }} />
          <Typography sx={{ color: t.textSecondary, fontSize: 13 }}>
            <strong style={{ color: t.textPrimary }}>Disclaimer:</strong> All rebate rates and requirements are indicative estimates. Always verify with official sources and consult tax professionals before making production decisions.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
