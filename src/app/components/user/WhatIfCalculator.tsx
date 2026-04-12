import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Slider,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material';
import { InfoOutlined } from '@mui/icons-material';
import logoBlack from '@/assets/ddbe9f875b0128308d18010a516a1a848d4b7b77.png';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';
import {
  computeScenario,
  type ScenarioResponse,
  type TerritoryScenario,
} from '@/services/calculator.service';

// ── ISO → flag emoji ──────────────────────────────────────────────────────────
const FLAG_FALLBACK = '\u{1F3AC}'; // clapper board
function isoToFlag(iso: string | null): string {
  if (!iso || iso.length !== 2) return FLAG_FALLBACK;
  const codePoints = [...iso.toUpperCase()].map(
    (c) => 0x1f1e6 - 65 + c.charCodeAt(0),
  );
  return String.fromCodePoint(...codePoints);
}

// ── Currency symbols ──────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '\u00a3', USD: '$', EUR: '\u20ac', ZAR: 'R', CAD: 'C$', AUD: 'A$',
  NGN: '\u20a6', HUF: 'Ft', CZK: 'K\u010d', MAD: 'MAD', NZD: 'NZ$',
  RON: 'RON', RSD: 'RSD',
};

const CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'ZAR'] as const;
const FORMATS = [
  'Feature Film', 'TV Series', 'Limited Series', 'Documentary',
  'Short Film', 'Animation', 'Animated Feature', 'Mini-Series',
  'Docuseries', 'Animation Series',
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatCurrencyLabel(amount: number, symbol: string): string {
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(0)}K`;
  return `${symbol}${amount.toFixed(0)}`;
}

function formatLargeNumber(amount: number, symbol: string): string {
  return `${symbol}${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function valueColor(value: number): string {
  if (value > 0) return '#1A8C4E';
  if (value < 0) return '#C17D10';
  return '#999999';
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const font = "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

const headerCellSx = {
  fontFamily: font,
  fontWeight: 700,
  fontSize: '11px',
  color: '#D4AF37',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
};

const sliderSx = {
  color: '#F5C800',
  height: 6,
  '& .MuiSlider-track': { bgcolor: '#F5C800', border: 'none' },
  '& .MuiSlider-rail': { bgcolor: 'rgba(0,0,0,0.08)' },
  '& .MuiSlider-thumb': {
    bgcolor: '#F5C800', width: 20, height: 20,
    border: '3px solid #FFFFFF',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
    '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(245,200,0,0.16)' },
  },
};

const selectSx = {
  fontFamily: font, fontWeight: 600, fontSize: '13px', color: '#111',
  height: '36px',
  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(0,0,0,0.12)' },
  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(245,200,0,0.5)' },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#F5C800' },
};

// ── Debounce interval (ms) ────────────────────────────────────────────────────
const DEBOUNCE_MS = 500;

// ── Component ─────────────────────────────────────────────────────────────────
export function WhatIfCalculator() {

  // Inputs
  const [budget, setBudget] = useState(4_000_000);
  const [budgetCurrency, setBudgetCurrency] = useState('GBP');
  const [vfxAllocation, setVfxAllocation] = useState(0);
  const [priority, setPriority] = useState<'incentive' | 'full' | 'location'>('full');
  const [format, setFormat] = useState('Feature Film');

  // API response
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_stale, setStale] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sym = CURRENCY_SYMBOLS[budgetCurrency] || budgetCurrency + ' ';

  // Debounced fetch
  const fetchScenario = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStale(true);

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);

      const { data, error: err } = await computeScenario({
        budget_amount: budget,
        budget_currency: budgetCurrency,
        vfx_pct: vfxAllocation,
        production_format: format,
        production_priority: priority,
      });

      if (err) {
        setError(err);
      } else if (data) {
        setScenario(data);
      }
      setLoading(false);
      setStale(false);
    }, DEBOUNCE_MS);
  }, [budget, budgetCurrency, vfxAllocation, priority, format]);

  // Trigger fetch on any input change
  useEffect(() => {
    fetchScenario();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchScenario]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const territories: TerritoryScenario[] = scenario?.territories ?? [];

  // Top territory stats for the Studio-Flexible panel
  const topByCrewIndex = [...territories]
    .filter((t) => t.crew_cost_index !== null)
    .sort((a, b) => (b.crew_cost_index ?? 0) - (a.crew_cost_index ?? 0))[0];
  const topByRate = [...territories].sort(
    (a, b) => (b.rate_gross ?? 0) - (a.rate_gross ?? 0),
  )[0];
  const topByCurrency = [...territories].sort(
    (a, b) => b.currency_advantage_score - a.currency_advantage_score,
  )[0];

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!territories.length) return;

    const header = [
      'Territory', 'Programme', 'Rate', 'Est. Incentive', 'Currency Advantage Score',
      'Crew Cost Index', 'Net Saving', 'Min Spend', 'Payment Timeline', 'Overall Score',
    ];
    const rows = territories.map((t) => [
      t.territory, t.programme, t.rate_display,
      t.estimated_rebate_display, String(t.currency_advantage_score),
      t.crew_cost_index != null ? String(t.crew_cost_index) : '',
      t.net_saving_display, t.min_spend ?? '', t.payment_timeline ?? '',
      String(t.overall_score),
    ]);

    const csv = [header, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `what-if-calculator-${budgetCurrency}-${(budget / 1_000_000).toFixed(1)}M.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [territories, budget, budgetCurrency]);

  // ── Currency advantage as monetary value ──────────────────────────────────
  function caValue(t: TerritoryScenario): number {
    return (scenario?.budget_gbp ?? budget) * (t.currency_advantage_score - 50) / 200;
  }

  // ── Crew saving as monetary value ─────────────────────────────────────────
  function crewValue(t: TerritoryScenario): number {
    if (t.crew_cost_index == null) return 0;
    return (scenario?.budget_gbp ?? budget) * (t.crew_cost_index - 50) / 200;
  }

  return (
    <Box sx={{ bgcolor: '#F8F6F0', minHeight: '100vh', fontFamily: font }}>
      {/* Navigation Bar */}
      <Box sx={{ bgcolor: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', py: 2 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <img src={logoBlack} alt="Prodculator" style={{ height: '32px', width: 'auto' }} />
            </Box>
            <Button
              onClick={handleExport}
              disabled={!territories.length}
              sx={{
                bgcolor: 'transparent',
                border: '1px solid rgba(245,200,0,0.4)',
                color: '#D4AF37',
                fontFamily: font, fontWeight: 700, fontSize: '13px',
                height: '36px', px: 2.5, borderRadius: '8px', textTransform: 'none',
                '&:hover': { bgcolor: 'rgba(245,200,0,0.08)', border: '1px solid rgba(245,200,0,0.6)' },
                '&.Mui-disabled': { opacity: 0.4 },
              }}
            >
              Export to CSV ↓
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: 5 }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '28px', color: '#111111', mb: 1 }}>
            What-If Calculator
          </Typography>
          <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '15px', color: '#555555' }}>
            Compare financial returns across {territories.length || '...'} territories at your budget
          </Typography>
        </Box>

        {/* Controls Card */}
        <Box
          sx={{
            bgcolor: '#FFFFFF', borderRadius: '12px',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            p: 4, mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {/* Budget Slider */}
            <Box sx={{ flex: 1, minWidth: '240px' }}>
              <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                Total Production Budget
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '22px', color: '#111111' }}>
                  {formatCurrencyLabel(budget, sym)}
                </Typography>
                <Select
                  value={budgetCurrency}
                  onChange={(e: SelectChangeEvent) => setBudgetCurrency(e.target.value)}
                  size="small"
                  sx={{ ...selectSx, minWidth: '80px' }}
                >
                  {CURRENCIES.map((c) => (
                    <MenuItem key={c} value={c}>{c}</MenuItem>
                  ))}
                </Select>
              </Box>
              <Slider
                value={budget}
                onChange={(_, value) => setBudget(value as number)}
                min={500000} max={50000000} step={100000}
                sx={sliderSx}
              />
              <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '11px', color: '#999999', mt: 1 }}>
                Range: {sym}500K to {sym}50M
              </Typography>
            </Box>

            {/* VFX Slider */}
            <Box sx={{ flex: 1, minWidth: '240px' }}>
              <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                VFX Budget Allocation
              </Typography>
              <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '22px', color: '#111111', mb: 2 }}>
                {vfxAllocation}%
              </Typography>
              <Slider
                value={vfxAllocation}
                onChange={(_, value) => setVfxAllocation(value as number)}
                min={0} max={60} step={1}
                sx={sliderSx}
              />
              <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '11px', color: '#999999', mt: 1, fontStyle: 'italic' }}>
                Applies supplementary VFX credits where available
              </Typography>
            </Box>

            {/* Format selector */}
            <Box sx={{ minWidth: '180px' }}>
              <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                Production Format
              </Typography>
              <Select
                value={format}
                onChange={(e: SelectChangeEvent) => setFormat(e.target.value)}
                size="small"
                sx={{ ...selectSx, width: '100%', mt: 1 }}
              >
                {FORMATS.map((f) => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        </Box>

        {/* Production Priority Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Tooltip
            title={
              <Box sx={{ p: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '13px', mb: 1, color: '#F5C800' }}>
                  Production Priority Options:
                </Typography>
                <Box sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>Maximise Incentive</Typography>
                  <Typography sx={{ fontSize: '11px', color: '#A0A7B8' }}>
                    Sorts territories by highest tax rebate/incentive percentage to maximize cash returns
                  </Typography>
                </Box>
                <Box sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>Full Picture</Typography>
                  <Typography sx={{ fontSize: '11px', color: '#A0A7B8' }}>
                    Balances incentives, currency advantages, and crew costs for total net savings
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: '12px', color: '#fff' }}>Location First</Typography>
                  <Typography sx={{ fontSize: '11px', color: '#A0A7B8' }}>
                    Prioritizes territories with strong infrastructure and crew depth
                  </Typography>
                </Box>
              </Box>
            }
            placement="left"
            arrow
            componentsProps={{
              tooltip: {
                sx: {
                  bgcolor: '#1E2330', border: '1px solid rgba(245,200,0,0.3)',
                  borderRadius: '8px', maxWidth: '350px',
                  '& .MuiTooltip-arrow': { color: '#1E2330', '&::before': { border: '1px solid rgba(245,200,0,0.3)' } },
                },
              },
            }}
          >
            <IconButton sx={{ color: '#F5C800', width: '32px', height: '32px', '&:hover': { bgcolor: 'rgba(245,200,0,0.1)' } }}>
              <InfoOutlined sx={{ fontSize: '18px' }} />
            </IconButton>
          </Tooltip>
          <Box sx={{ bgcolor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '9999px', p: '3px', display: 'flex', gap: '2px' }}>
            {(['incentive', 'full', 'location'] as const).map((p) => (
              <Button
                key={p}
                onClick={() => setPriority(p)}
                sx={{
                  bgcolor: priority === p ? '#F5C800' : 'transparent',
                  color: priority === p ? '#000000' : '#999999',
                  fontFamily: font,
                  fontWeight: priority === p ? 700 : 400,
                  fontSize: '13px', px: 3, py: 1,
                  borderRadius: '9999px', textTransform: 'none', minWidth: 'auto',
                  '&:hover': { bgcolor: priority === p ? '#F5C800' : 'rgba(0,0,0,0.04)' },
                }}
              >
                {p === 'incentive' ? 'Maximise Incentive' : p === 'full' ? 'Full Picture' : 'Location First'}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading state (initial) */}
        {loading && !scenario && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <LoadingSpinner size={40} message="Calculating scenarios..." />
          </Box>
        )}

        {/* Territory Comparison Table */}
        {territories.length > 0 && (
          <Box
            sx={{
              bgcolor: '#FFFFFF', borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden', mb: 4,
              position: 'relative',
            }}
          >
            {/* Loading overlay — covers table while recalculating */}
            {loading && scenario && (
              <Box
                sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  borderRadius: '12px',
                  pointerEvents: 'all',
                }}
              >
                <LoadingSpinner size={36} message="Recalculating..." />
              </Box>
            )}

            {/* Header Row */}
            <Box
              sx={{
                display: 'flex', bgcolor: 'rgba(245,200,0,0.1)',
                height: '44px', alignItems: 'center', px: 2,
                borderBottom: '1px solid rgba(0,0,0,0.04)',
                minWidth: '1320px',
              }}
            >
              <Box sx={{ width: '200px' }}><Typography sx={headerCellSx}>Territory</Typography></Box>
              <Box sx={{ width: '160px' }}><Typography sx={headerCellSx}>Programme</Typography></Box>
              <Box sx={{ width: '110px' }}><Typography sx={headerCellSx}>Incentive Rate</Typography></Box>
              <Box sx={{ width: '140px' }}><Typography sx={headerCellSx}>Est. Incentive</Typography></Box>
              <Box sx={{ width: '140px' }}><Typography sx={headerCellSx}>Currency Adv.</Typography></Box>
              <Box sx={{ width: '120px' }}><Typography sx={headerCellSx}>Crew Saving</Typography></Box>
              <Box sx={{ width: '140px' }}><Typography sx={headerCellSx}>NET SAVING</Typography></Box>
              <Box sx={{ width: '110px' }}><Typography sx={headerCellSx}>Min Spend</Typography></Box>
              <Box sx={{ width: '120px' }}><Typography sx={headerCellSx}>Payment</Typography></Box>
              <Box sx={{ width: '80px' }}><Typography sx={headerCellSx}>Score</Typography></Box>
            </Box>

            {/* Scrollable body */}
            <Box sx={{ overflowX: 'auto' }}>
              {/* Data Rows */}
              {territories.map((t, index) => {
                const caVal = caValue(t);
                const crewVal = crewValue(t);
                const isTopScore = index === 0;

                return (
                  <Box
                    key={t.territory}
                    sx={{
                      display: 'flex',
                      bgcolor: index % 2 === 0 ? '#FFFFFF' : '#FAFAF8',
                      minHeight: '52px', alignItems: 'center', px: 2,
                      borderBottom: '1px solid rgba(0,0,0,0.04)',
                      minWidth: '1320px',
                      '&:hover': { bgcolor: 'rgba(245,200,0,0.04)' },
                    }}
                  >
                    {/* Territory */}
                    <Box sx={{ width: '200px', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '18px' }}>{isoToFlag(t.iso)}</Typography>
                      <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: '#111111' }}>
                        {t.territory}
                      </Typography>
                      {isTopScore && (
                        <Chip
                          label="TOP"
                          sx={{
                            bgcolor: '#F5C800', color: '#000000',
                            fontFamily: font, fontWeight: 700, fontSize: '10px',
                            height: '20px', textTransform: 'uppercase', borderRadius: '10px',
                          }}
                        />
                      )}
                    </Box>

                    {/* Programme */}
                    <Box sx={{ width: '160px' }}>
                      <Tooltip title={t.programme_note || ''} disableHoverListener={!t.programme_note}>
                        <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '13px', color: '#555555' }}>
                          {t.programme}
                        </Typography>
                      </Tooltip>
                    </Box>

                    {/* Rate */}
                    <Box sx={{ width: '110px' }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: '#111111' }}>
                        {t.rate_display}
                      </Typography>
                    </Box>

                    {/* Est. Incentive */}
                    <Box sx={{ width: '140px' }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: '#1A8C4E' }}>
                        {t.estimated_rebate_display}
                      </Typography>
                      {t.vfx_uplift_display && (
                        <Typography sx={{ fontFamily: font, fontSize: '10px', color: '#999', fontStyle: 'italic' }}>
                          +{t.vfx_uplift_display} VFX
                        </Typography>
                      )}
                    </Box>

                    {/* Currency Advantage */}
                    <Box sx={{ width: '140px' }}>
                      {caVal !== 0 ? (
                        <Tooltip title={t.currency_advantage_warning || `Score: ${t.currency_advantage_score}/100`}>
                          <Typography
                            sx={{
                              fontFamily: font, fontWeight: 600, fontSize: '14px',
                              color: valueColor(caVal),
                            }}
                          >
                            {caVal > 0 ? '+' : ''}{formatLargeNumber(Math.round(caVal), sym)}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography sx={{ fontFamily: font, fontSize: '14px', color: '#999999' }}>—</Typography>
                      )}
                    </Box>

                    {/* Crew Saving */}
                    <Box sx={{ width: '120px' }}>
                      {crewVal !== 0 ? (
                        <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: valueColor(crewVal) }}>
                          {crewVal > 0 ? '+' : ''}{formatLargeNumber(Math.round(crewVal), sym)}
                        </Typography>
                      ) : (
                        <Typography sx={{ fontFamily: font, fontSize: '14px', color: '#999999' }}>—</Typography>
                      )}
                    </Box>

                    {/* Net Saving */}
                    <Box sx={{ width: '140px' }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '16px', color: '#D4AF37' }}>
                        {t.net_saving_display}
                      </Typography>
                    </Box>

                    {/* Min Spend */}
                    <Box sx={{ width: '110px' }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '13px', color: '#555555' }}>
                        {t.min_spend || '\u2014'}
                      </Typography>
                    </Box>

                    {/* Payment */}
                    <Box sx={{ width: '120px' }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '13px', color: '#555555' }}>
                        {t.payment_timeline || '\u2014'}
                      </Typography>
                    </Box>

                    {/* Score */}
                    <Box sx={{ width: '80px' }}>
                      <Typography
                        sx={{
                          fontFamily: font, fontWeight: 700, fontSize: '14px',
                          color: t.overall_score >= 60 ? '#1A8C4E' : t.overall_score >= 40 ? '#D4AF37' : '#999',
                        }}
                      >
                        {t.overall_score}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}

              {/* Baseline Row */}
              <Box
                sx={{
                  display: 'flex', bgcolor: '#F8F6F0',
                  height: '52px', alignItems: 'center', px: 2,
                  borderTop: '1px solid rgba(0,0,0,0.08)',
                  minWidth: '1320px',
                }}
              >
                <Box sx={{ width: '200px' }}>
                  <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: '#CCCCCC' }}>
                    No-incentive baseline
                  </Typography>
                  <Typography sx={{ fontFamily: font, fontSize: '10px', color: '#BBBBBB' }}>
                    Comparison baseline — not a recommendation
                  </Typography>
                </Box>
                {[160, 110, 140, 140, 120].map((w, i) => (
                  <Box key={i} sx={{ width: `${w}px` }}>
                    <Typography sx={{ fontFamily: font, fontSize: '14px', color: '#CCCCCC' }}>{'\u2014'}</Typography>
                  </Box>
                ))}
                <Box sx={{ width: '140px' }}>
                  <Typography sx={{ fontFamily: font, fontSize: '14px', color: '#CCCCCC' }}>{sym}0</Typography>
                </Box>
                {[110, 120, 80].map((w, i) => (
                  <Box key={i} sx={{ width: `${w}px` }}>
                    <Typography sx={{ fontFamily: font, fontSize: '14px', color: '#CCCCCC' }}>{'\u2014'}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        )}

        {/* Studio Flexibility Panel */}
        {territories.length > 0 && (
          <Box
            sx={{
              bgcolor: '#FFFFFF', border: '1px solid rgba(245,200,0,0.3)',
              borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', p: 3,
            }}
          >
            <Box sx={{ display: 'flex', gap: 3 }}>
              <Typography sx={{ fontSize: '28px' }}>📦</Typography>
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '16px', color: '#111111' }}>
                    Studio-Flexible Productions
                  </Typography>
                  <Chip
                    label="For INT-heavy scripts"
                    sx={{
                      bgcolor: 'rgba(245,200,0,0.15)', color: '#D4AF37',
                      fontFamily: font, fontWeight: 700, fontSize: '10px',
                      height: '22px', textTransform: 'uppercase', borderRadius: '11px',
                    }}
                  />
                </Box>

                <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '13px', color: '#555555', lineHeight: 1.7, mb: 3 }}>
                  When 70%+ of your scenes are interior, location becomes a financial decision. Interiors can be
                  built anywhere — meaning the best incentive return, currency advantage, and crew cost
                  territories become your optimal choice.
                </Typography>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {topByCrewIndex && (
                    <Box sx={{ flex: 1, minWidth: '180px', bgcolor: '#F8F6F0', borderRadius: '8px', p: 2 }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '12px', color: '#777777', mb: 0.5 }}>
                        {topByCrewIndex.territory} vs UK
                      </Typography>
                      <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: '#1A8C4E' }}>
                        Cost efficiency: {topByCrewIndex.crew_cost_index}/100
                      </Typography>
                    </Box>
                  )}
                  {topByRate && (
                    <Box sx={{ flex: 1, minWidth: '180px', bgcolor: '#F8F6F0', borderRadius: '8px', p: 2 }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '12px', color: '#777777', mb: 0.5 }}>
                        {topByRate.territory}
                      </Typography>
                      <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: '#D4AF37' }}>
                        {topByRate.rate_display} {topByRate.rate_type === 'cash_rebate' ? 'cash rebate' : 'incentive'}
                      </Typography>
                    </Box>
                  )}
                  {topByCurrency && topByCurrency.currency_advantage_score > 55 && (
                    <Box sx={{ flex: 1, minWidth: '180px', bgcolor: '#F8F6F0', borderRadius: '8px', p: 2 }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '12px', color: '#777777', mb: 0.5 }}>
                        {topByCurrency.territory}
                      </Typography>
                      <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: '#1A8C4E' }}>
                        {budgetCurrency} purchasing power advantage
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
