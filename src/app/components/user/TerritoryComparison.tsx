import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Tooltip,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Compare,
  Download,
  Close,
  Info,
} from '@mui/icons-material';
import {
  fetchTerritoryList,
  compareTerritories,
  type TerritoryListItem,
  type TerritoryCompareItem,
} from '@/services/territory.service';

// ── Flag emoji helper ────────────────────────────────────────────────────────
const FLAG_FALLBACK = '\u{1F3AC}';
function isoToFlag(iso: string | null): string {
  if (!iso || iso.length !== 2) return FLAG_FALLBACK;
  const codePoints = [...iso.toUpperCase()].map(
    (c) => 0x1f1e6 - 65 + c.charCodeAt(0),
  );
  return String.fromCodePoint(...codePoints);
}

// ── Group territories by parent country ──────────────────────────────────────
function groupByCountry(territories: TerritoryListItem[]): Record<string, TerritoryListItem[]> {
  const groups: Record<string, TerritoryListItem[]> = {};
  // First pass: top-level countries
  for (const t of territories) {
    if (!t.parent) {
      groups[t.label] = groups[t.label] || [];
    }
  }
  // Second pass: sub-territories under their parents
  for (const t of territories) {
    if (t.parent) {
      groups[t.parent] = groups[t.parent] || [];
      groups[t.parent].push(t);
    }
  }
  // Add countries that have no sub-territories as their own entry
  for (const t of territories) {
    if (!t.parent) {
      if (!groups[t.label]?.length) {
        groups[t.label] = [t];
      }
    }
  }
  return groups;
}

export function TerritoryComparison() {
  const [availableTerritories, setAvailableTerritories] = useState<TerritoryListItem[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [comparedTerritories, setComparedTerritories] = useState<TerritoryCompareItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available territories on mount
  useEffect(() => {
    (async () => {
      setListLoading(true);
      const { data, error: err } = await fetchTerritoryList();
      if (err) {
        setError(err);
      } else if (data) {
        const list = data.territories ?? [];
        setAvailableTerritories(list);
        // Default selection: first two national territories with incentives
        const nationals = list.filter((t) => !t.parent);
        const defaults = nationals.slice(0, 2).map((t) => t.label);
        setSelectedLabels(defaults);
      }
      setListLoading(false);
    })();
  }, []);

  // Fetch comparison data when selection changes
  const fetchComparison = useCallback(async () => {
    if (!selectedLabels.length) {
      setComparedTerritories([]);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await compareTerritories(selectedLabels);
    if (err) {
      setError(err);
    } else if (data) {
      setComparedTerritories(data.territories ?? []);
    }
    setLoading(false);
  }, [selectedLabels]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  const handleAddTerritory = (label: string) => {
    if (label && selectedLabels.length < 4 && !selectedLabels.includes(label)) {
      setSelectedLabels([...selectedLabels, label]);
    }
  };

  const handleRemoveTerritory = (label: string) => {
    if (selectedLabels.length > 1) {
      setSelectedLabels(selectedLabels.filter((l) => l !== label));
    }
  };

  const handleExportCSV = () => {
    if (!comparedTerritories.length) return;
    const header = [
      'Territory', 'Tax Rebate', 'Post-Production Bonus', 'Min Spend',
      'Avg Crew Cost', 'Payment Timeline', 'Labor Requirement',
      'Highlights', 'Restrictions',
    ];
    const rows = comparedTerritories.map((t) => [
      t.label,
      t.incentive?.tax_rebate || 'N/A',
      t.incentive?.post_production_bonus || 'N/A',
      t.incentive?.min_spend || 'N/A',
      t.crew_costs?.avg_day_rate_display || 'N/A',
      t.incentive?.payment_timeline || 'N/A',
      t.labor_requirement || 'N/A',
      t.highlights.join('; '),
      t.restrictions.join('; '),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `territory-comparison-${selectedLabels.join('-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const availableToAdd = (availableTerritories ?? []).filter(
    (t) => !selectedLabels.includes(t.label),
  );
  const grouped = groupByCountry(availableToAdd);

  if (listLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: '#D4AF37' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Compare sx={{ fontSize: 28, color: '#D4AF37', mr: 1.5 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#ffffff' }}>
            Territory Comparison
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Download />}
          onClick={handleExportCSV}
          disabled={!comparedTerritories.length}
          sx={{
            borderColor: '#D4AF37',
            color: '#D4AF37',
            '&:hover': { borderColor: '#D4AF37', color: '#D4AF37' },
            '&.Mui-disabled': { opacity: 0.4 },
          }}
        >
          Export CSV
        </Button>
      </Box>

      {/* Territory picker */}
      {availableToAdd.length > 0 && selectedLabels.length < 4 && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            bgcolor: 'rgba(212, 175, 55, 0.05)',
            border: '1px solid rgba(212, 175, 55, 0.15)',
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography variant="body2" sx={{ color: '#a0a0a0' }}>
            Compare up to <strong style={{ color: '#D4AF37' }}>4 territories</strong> side-by-side
          </Typography>
          <FormControl size="small" sx={{ minWidth: 300, flex: '1 1 300px', maxWidth: 400 }}>
            <InputLabel sx={{ color: '#a0a0a0' }}>Add Territory</InputLabel>
            <Select
              label="Add Territory"
              onChange={(e) => handleAddTerritory(e.target.value as string)}
              value=""
              sx={{
                color: '#ffffff',
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(212, 175, 55, 0.3)' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
              }}
            >
              {Object.entries(grouped).map(([country, items]) => [
                <MenuItem key={`header-${country}`} disabled sx={{ color: '#D4AF37', fontWeight: 700 }}>
                  {isoToFlag(items[0]?.iso || null)} {country.toUpperCase()}
                </MenuItem>,
                ...items.map((t) => (
                  <MenuItem key={t.label} value={t.label} sx={{ pl: 4 }}>
                    {t.label}
                  </MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
          <Typography variant="caption" sx={{ color: '#666', ml: 'auto' }}>
            {availableToAdd.length} available territories
          </Typography>
        </Box>
      )}

      {/* Error state */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Comparison Table */}
      {comparedTerritories.length > 0 && (
        <Box sx={{ position: 'relative' }}>
          {loading && (
            <Box
              sx={{
                position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10, borderRadius: 2,
              }}
            >
              <CircularProgress sx={{ color: '#D4AF37' }} />
            </Box>
          )}
          <TableContainer
            component={Paper}
            sx={{
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              borderRadius: 2,
            }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'rgba(212, 175, 55, 0.1)' }}>
                  <TableCell sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.95rem' }}>
                    Criteria
                  </TableCell>
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={{ color: '#D4AF37', fontWeight: 700 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ fontSize: '18px' }}>{isoToFlag(t.iso)}</Typography>
                        <Box>
                          <Typography variant="h6" sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '1rem' }}>
                            {t.label}
                          </Typography>
                          {t.parent && (
                            <Typography variant="caption" sx={{ color: '#a0a0a0' }}>
                              {t.parent}
                            </Typography>
                          )}
                        </Box>
                        {selectedLabels.length > 1 && (
                          <IconButton
                            size="small"
                            onClick={() => handleRemoveTerritory(t.label)}
                            sx={{ color: '#666', '&:hover': { color: '#D4AF37' } }}
                          >
                            <Close fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {/* Tax Rebate */}
                <ComparisonRow label="Tax Rebate" tooltip="Base tax incentive rate">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Typography variant="h6" sx={{ color: '#4CAF50', fontWeight: 700 }}>
                        {t.incentive?.tax_rebate || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Programme */}
                <ComparisonRow label="Programme">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
                        {t.incentive?.programme || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Post-Production Bonus */}
                <ComparisonRow label="Post-Production / VFX Bonus">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Typography
                        sx={{
                          color: t.incentive?.post_production_bonus ? '#4CAF50' : '#a0a0a0',
                        }}
                      >
                        {t.incentive?.post_production_bonus || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Minimum Spend */}
                <ComparisonRow label="Minimum Spend">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Typography sx={{ color: '#ffffff' }}>
                        {t.incentive?.min_spend || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Avg Crew Cost */}
                <ComparisonRow label="Avg Crew Cost">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Typography sx={{ color: '#ffffff' }}>
                        {t.crew_costs?.avg_day_rate_display || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Crew Roles Sample */}
                <ComparisonRow label="Sample Crew Rates">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      {t.crew_costs?.sample_roles && Object.keys(t.crew_costs.sample_roles).length > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                          {Object.entries(t.crew_costs.sample_roles).slice(0, 4).map(([role, rate]) => (
                            <Typography key={role} variant="caption" sx={{ color: '#a0a0a0' }}>
                              {role}: <span style={{ color: '#ffffff' }}>{rate}</span>
                            </Typography>
                          ))}
                        </Box>
                      ) : (
                        <Typography sx={{ color: '#666' }}>—</Typography>
                      )}
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Cap */}
                <ComparisonRow label="Rebate Cap">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Typography sx={{ color: '#ffffff' }}>
                        {t.incentive?.cap_display || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Payment Timeline */}
                <ComparisonRow label="Payment Timeline">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Typography sx={{ color: '#ffffff' }}>
                        {t.incentive?.payment_timeline || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Labor Requirement */}
                <ComparisonRow label="Labor Requirement">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
                        {t.labor_requirement || 'No specific requirement'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Highlights */}
                <ComparisonRow label="Highlights">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={dataCellSx}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {t.highlights.length > 0 ? (
                          t.highlights.map((h, idx) => (
                            <Typography key={idx} variant="body2" sx={{ color: '#4CAF50', fontSize: '0.8rem' }}>
                              ✓ {h}
                            </Typography>
                          ))
                        ) : (
                          <Typography sx={{ color: '#666' }}>—</Typography>
                        )}
                      </Box>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Restrictions */}
                <ComparisonRow label="Restrictions">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={{ borderBottom: 'none' }}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        {t.restrictions.length > 0 ? (
                          t.restrictions.map((r, idx) => (
                            <Typography key={idx} variant="body2" sx={{ color: '#ff9800', fontSize: '0.8rem' }}>
                              ⚠ {r}
                            </Typography>
                          ))
                        ) : (
                          <Typography sx={{ color: '#666' }}>—</Typography>
                        )}
                      </Box>
                    </TableCell>
                  ))}
                </ComparisonRow>

                {/* Last Verified */}
                <ComparisonRow label="Data Last Verified">
                  {comparedTerritories.map((t) => (
                    <TableCell key={t.label} sx={{ borderBottom: 'none' }}>
                      <Typography variant="caption" sx={{ color: '#666' }}>
                        {t.incentive?.last_verified || 'N/A'}
                      </Typography>
                    </TableCell>
                  ))}
                </ComparisonRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Empty state */}
      {!loading && !comparedTerritories.length && !error && (
        <Paper
          sx={{
            p: 6, textAlign: 'center', bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
          }}
        >
          <Compare sx={{ fontSize: 48, color: '#333', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#a0a0a0', mb: 1 }}>
            Select territories to compare
          </Typography>
          <Typography variant="body2" sx={{ color: '#666' }}>
            Use the dropdown above to add up to 4 territories for side-by-side comparison
          </Typography>
        </Paper>
      )}

      {/* Disclaimer */}
      {comparedTerritories.length > 0 && (
        <Alert
          severity="info"
          sx={{
            mt: 3,
            bgcolor: 'rgba(33, 150, 243, 0.1)',
            color: '#2196F3',
            border: '1px solid rgba(33, 150, 243, 0.2)',
          }}
        >
          <Typography variant="body2">
            <strong>Disclaimer:</strong> All rebate rates, crew costs, and requirements are indicative estimates.
            Always verify with official sources and consult tax professionals before making production decisions.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

// ── Helper components ──────────────────────────────────────────────────────

const dataCellSx = { color: '#ffffff', borderBottom: '1px solid #222' };

function ComparisonRow({
  label,
  tooltip,
  children,
}: {
  label: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <TableRow>
      <TableCell sx={{ color: '#ffffff', fontWeight: 700, borderBottom: '1px solid #222', whiteSpace: 'nowrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {label}
          {tooltip && (
            <Tooltip title={tooltip}>
              <Info sx={{ fontSize: 14, color: '#666' }} />
            </Tooltip>
          )}
        </Box>
      </TableCell>
      {children}
    </TableRow>
  );
}
