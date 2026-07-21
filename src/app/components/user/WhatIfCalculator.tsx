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
import { ResultsGate } from '@/app/components/common/PlanGate';
import { usePlanGate } from '@/app/hooks/usePlanGate';
import { useThemeMode } from '@/app/theme/AppTheme';
import { useHeaderActions } from '@/app/components/user/b2c/headerActions';
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
  'Short Film', 'Animation', 'Animated Feature', 'Mini Series',
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

// ── Score weights by priority ─────────────────────────────────────────────────
export const SCORE_WEIGHTS_INFO = {
  full: [
    { label: 'Incentive Strength', pct: '30%', note: 'rebate/credit value' },
    { label: 'Incentive Reliability', pct: '15%', note: 'bankability & payment track record' },
    { label: 'Cost Efficiency', pct: '20%', note: 'curated territory cost rating' },
    { label: 'Currency Advantage', pct: '15%', note: 'your budget vs local currency' },
    { label: 'Crew Depth', pct: '10%', note: 'territory tier rating' },
    { label: 'Infrastructure', pct: '10%', note: 'territory tier rating' },
  ],
  incentive: [
    { label: 'Incentive Strength', pct: '45%', note: 'rebate/credit value' },
    { label: 'Incentive Reliability', pct: '15%', note: 'bankability & payment track record' },
    { label: 'Cost Efficiency', pct: '15%', note: 'curated territory cost rating' },
    { label: 'Currency Advantage', pct: '15%', note: 'your budget vs local currency' },
    { label: 'Crew Depth', pct: '5%', note: 'territory tier rating' },
    { label: 'Infrastructure', pct: '5%', note: 'territory tier rating' },
  ],
  location: [
    { label: 'Crew Depth', pct: '25%', note: 'territory tier rating' },
    { label: 'Infrastructure', pct: '20%', note: 'territory tier rating' },
    { label: 'Cost Efficiency', pct: '20%', note: 'curated territory cost rating' },
    { label: 'Incentive Strength', pct: '15%', note: 'rebate/credit value' },
    { label: 'Incentive Reliability', pct: '10%', note: 'bankability & payment track record' },
    { label: 'Currency Advantage', pct: '10%', note: 'your budget vs local currency' },
  ],
} as const;

// ── Component ─────────────────────────────────────────────────────────────────
export function WhatIfCalculator({ embedded = false }: { embedded?: boolean } = {}) {
  const { hasAccess } = usePlanGate('professional');

  // Inputs
  const [budget, setBudget] = useState(4_000_000);
  const [budgetCurrency, setBudgetCurrency] = useState('GBP');
  const [vfxAllocation, setVfxAllocation] = useState(0);
  const [priority, setPriority] = useState<'incentive' | 'full' | 'location'>('full');
  const [format, setFormat] = useState('Feature Film');
  const [baseline, setBaseline] = useState<'GB' | 'US'>('GB');

  // API response
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [_stale, setStale] = useState(false);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sym = CURRENCY_SYMBOLS[budgetCurrency] || budgetCurrency + ' ';

  // Debounced fetch
  const fetchScenario = useCallback(() => {
    if (!hasAccess) return;
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
        baseline,
      });

      if (err) {
        setError(err);
      } else if (data) {
        setScenario(data);
      }
      setLoading(false);
      setStale(false);
    }, DEBOUNCE_MS);
  }, [budget, budgetCurrency, vfxAllocation, priority, format, baseline]);

  // Trigger fetch on any input change
  useEffect(() => {
    fetchScenario();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchScenario]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const territories: TerritoryScenario[] = scenario?.territories ?? [];


  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!territories.length) return;

    const header = [
      'Territory', 'Programme', 'Rate', 'Bankability', 'FRS', 'FRS Verdict', 'Est. Incentive', 'Currency Advantage Score',
      'Net Saving', 'Min Spend', 'Payment Timeline', 'Overall Score',
    ];
    const rows = territories.map((t) => [
      t.territory, t.programme, t.rate_display,
      t.bankability_label ?? '', t.financial_return_score != null ? String(t.financial_return_score) : '', t.financial_return_verdict ?? '',
      t.estimated_rebate_display, String(t.currency_advantage_score),
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
  // Uses `budget` (original amount in budget currency) — not budget_gbp —
  // so the result is already in the user's currency and can be shown with `sym`.
  // This mirrors the backend: ca_value_gbp / budget_gbp * budget_original_amount.
  function caValue(t: TerritoryScenario): number {
    return budget * (t.currency_advantage_score - 50) / 200;
  }

  // ── Score tooltip content ─────────────────────────────────────────────────
  const scoreWeights = SCORE_WEIGHTS_INFO[priority];
  const scoreTooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '12px', mb: 1.5, color: '#F5C800' }}>
        Score out of 100
      </Typography>
      <Typography sx={{ fontSize: '11px', color: '#A0A7B8', mb: 1.5, lineHeight: 1.5 }}>
        Weighted across 6 dimensions for <strong style={{ color: '#fff' }}>
          {priority === 'incentive' ? 'Maximise Incentive' : priority === 'full' ? 'Full Picture' : 'Location First'}
        </strong> mode:
      </Typography>
      {scoreWeights.map((w) => {
        const note = 'note' in w ? w.note : '';
        return (
          <Box key={w.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
            <Typography sx={{ fontSize: '11px', color: '#ccc' }}>
              {w.label}{note ? ` (${note})` : ''}
            </Typography>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#F5C800', flexShrink: 0 }}>
              {w.pct}
            </Typography>
          </Box>
        );
      })}
      <Typography sx={{ fontSize: '10px', color: '#666', mt: 1.5, lineHeight: 1.4 }}>
        Crew Depth and Infrastructure use Prodculator territory tier ratings.
        Upload your script for production specific narrative analysis.
      </Typography>
    </Box>
  );

  // Palette: the standalone /what-if and /tools/what-if pages stay light; when
  // embedded in the dashboard the calculator re-themes to the app's black/gold
  // so it matches the surrounding surfaces (and the sibling TerritoryComparison).
  // Embedded in the dashboard, follow the app's light/dark mode; standalone
  // /what-if pages stay light.
  const { mode: appMode } = useThemeMode();
  const useDarkPal = embedded && appMode === 'dark';
  const pal = useDarkPal
    ? {
        pageBg: 'transparent', navBg: '#0a0a0a', navBorder: 'rgba(212,175,55,0.2)',
        cardBg: '#0f0f0f', cardBorder: 'rgba(212,175,55,0.2)', cardShadow: 'none',
        headStripe: 'rgba(212,175,55,0.08)', rowBorder: 'rgba(212,175,55,0.08)',
        rowAlt: 'rgba(255,255,255,0.02)', rowBase: 'transparent', rowHover: 'rgba(212,175,55,0.08)',
        heading: '#ffffff', subtext: '#a0a0a0', label: '#8a8a8a', value: '#ffffff',
        muted: '#777777', toggleBg: '#000000', toggleBorder: 'rgba(212,175,55,0.25)',
        toggleInactive: '#a0a0a0', toggleHover: 'rgba(212,175,55,0.12)',
        skeleton: 'rgba(255,255,255,0.08)', skeleton2: 'rgba(255,255,255,0.05)',
        overlay: 'rgba(0,0,0,0.6)', accent: '#D4AF37', accentText: '#000000',
      }
    : {
        pageBg: '#F8F6F0', navBg: '#FFFFFF', navBorder: 'rgba(0,0,0,0.08)',
        cardBg: '#FFFFFF', cardBorder: 'rgba(0,0,0,0.06)', cardShadow: '0 2px 12px rgba(0,0,0,0.06)',
        headStripe: 'rgba(245,200,0,0.1)', rowBorder: 'rgba(0,0,0,0.04)',
        rowAlt: '#FAFAF8', rowBase: '#FFFFFF', rowHover: 'rgba(245,200,0,0.04)',
        heading: '#111111', subtext: '#555555', label: '#999999', value: '#111111',
        muted: '#999999', toggleBg: '#FFFFFF', toggleBorder: 'rgba(0,0,0,0.08)',
        toggleInactive: '#999999', toggleHover: 'rgba(0,0,0,0.04)',
        skeleton: '#E8E8E8', skeleton2: '#EEEEEE',
        overlay: 'rgba(255,255,255,0.7)', accent: '#F5C800', accentText: '#000000',
      };
  const sliderSxLocal = useDarkPal
    ? {
        ...sliderSx, color: pal.accent,
        '& .MuiSlider-track': { bgcolor: pal.accent, border: 'none' },
        '& .MuiSlider-rail': { bgcolor: 'rgba(255,255,255,0.15)' },
        '& .MuiSlider-thumb': {
          bgcolor: pal.accent, width: 20, height: 20, border: '3px solid #0a0a0a',
          boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
          '&:hover, &.Mui-focusVisible': { boxShadow: '0 0 0 8px rgba(212,175,55,0.18)' },
        },
      }
    : sliderSx;
  const selectSxLocal = useDarkPal
    ? {
        fontFamily: font, fontWeight: 600, fontSize: '13px', color: '#ffffff', height: '36px',
        '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(212,175,55,0.35)' },
        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(212,175,55,0.6)' },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: pal.accent },
        '& .MuiSvgIcon-root': { color: pal.accent },
      }
    : selectSx;

  // When embedded, push the Export action into the dashboard top bar.
  useHeaderActions(
    embedded ? (
      <Button variant="outlined" onClick={handleExport} disabled={!territories.length} sx={{ whiteSpace: 'nowrap' }}>
        Export to CSV
      </Button>
    ) : null,
    [embedded, territories.length],
  );

  return (
    <Box sx={{ bgcolor: embedded ? 'transparent' : pal.pageBg, fontFamily: font, ...(embedded ? {} : { minHeight: '100dvh' }) }}>
      {/* Standalone-only top bar (logo + export). When embedded in the dashboard
          the export action moves into the page-header row (mockup layout). */}
      {!embedded && (
        <Box sx={{ bgcolor: pal.navBg, borderBottom: `1px solid ${pal.navBorder}`, py: 2 }}>
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <img src={logoBlack} alt="Prodculator" style={{ height: '32px', width: 'auto' }} />
              </Box>
              <Button
                onClick={handleExport}
                disabled={!territories.length}
                sx={{
                  bgcolor: 'transparent', border: '1px solid rgba(245,200,0,0.4)', color: '#D4AF37',
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
      )}

      {/* Main Content */}
      <Container maxWidth={embedded ? false : 'xl'} disableGutters={embedded} sx={{ py: embedded ? 0 : { xs: 3, sm: 5 } }}>
        {/* Page Header — only for the standalone page. When embedded, the title
            + description live in the dashboard top bar and the Export action is
            registered into that top bar (see useHeaderActions above). */}
        {!embedded && (
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: { xs: '20px', sm: '26px' }, color: pal.heading }}>
                  What If Calculator
                </Typography>
                {!hasAccess && (
                  <Chip label="Pro" size="small" sx={{ bgcolor: 'rgba(212,175,55,0.15)', color: '#D4AF37', fontFamily: font, fontWeight: 700, fontSize: '11px', height: '22px' }} />
                )}
              </Box>
              <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: { xs: '13px', sm: '15px' }, color: pal.subtext }}>
                {hasAccess
                  ? `Compare financial returns across ${territories.length || '...'} territories at your budget`
                  : 'Configure your production parameters, upgrade to see results across all territories'}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Controls Card */}
        <Box
          sx={{
            bgcolor: pal.cardBg, borderRadius: '12px',
            border: `1px solid ${pal.cardBorder}`,
            boxShadow: pal.cardShadow,
            p: { xs: 2, sm: 4 }, mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 }, flexWrap: 'wrap' }}>
            {/* Budget Slider */}
            <Box sx={{ flex: 1, minWidth: '240px' }}>
              <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '11px', color: pal.label, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                Total Production Budget
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '22px', color: pal.value }}>
                  {formatCurrencyLabel(budget, sym)}
                </Typography>
                <Select
                  value={budgetCurrency}
                  onChange={(e: SelectChangeEvent) => setBudgetCurrency(e.target.value)}
                  size="small"
                  sx={{ ...selectSxLocal, minWidth: '80px' }}
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
                sx={sliderSxLocal}
              />
              <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '11px', color: pal.label, mt: 1 }}>
                Range: {sym}500K to {sym}50M
              </Typography>
            </Box>

            {/* VFX Slider */}
            <Box sx={{ flex: 1, minWidth: '240px' }}>
              <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '11px', color: pal.label, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                VFX Budget Allocation
              </Typography>
              <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '22px', color: pal.value, mb: 2 }}>
                {vfxAllocation}%
              </Typography>
              <Slider
                value={vfxAllocation}
                onChange={(_, value) => setVfxAllocation(value as number)}
                min={0} max={60} step={1}
                sx={sliderSxLocal}
              />
              <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '11px', color: pal.label, mt: 1, fontStyle: 'italic' }}>
                Applies supplementary VFX credits where available
              </Typography>
            </Box>

            {/* Format selector */}
            <Box sx={{ minWidth: '180px' }}>
              <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '11px', color: pal.label, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                Production Format
              </Typography>
              <Select
                value={format}
                onChange={(e: SelectChangeEvent) => setFormat(e.target.value)}
                size="small"
                sx={{ ...selectSxLocal, width: '100%', mt: 1 }}
              >
                {FORMATS.map((f) => (
                  <MenuItem key={f} value={f}>{f}</MenuItem>
                ))}
              </Select>
            </Box>
          </Box>
        </Box>

        {/* Production Priority & Baseline Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {/* Baseline toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '11px', color: pal.label, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Baseline
            </Typography>
            <Box sx={{ bgcolor: pal.toggleBg, border: `1px solid ${pal.toggleBorder}`, borderRadius: '10px', p: '3px', display: 'flex', gap: '2px' }}>
              {(['US', 'GB'] as const).map((b) => (
                <Button
                  key={b}
                  onClick={() => setBaseline(b)}
                  sx={{
                    bgcolor: baseline === b ? pal.accent : 'transparent',
                    color: baseline === b ? pal.accentText : pal.toggleInactive,
                    fontFamily: font,
                    fontWeight: baseline === b ? 700 : 400,
                    fontSize: '12px', px: 1.75, py: 0.5, whiteSpace: 'nowrap',
                    borderRadius: '8px', textTransform: 'none', minWidth: 'auto',
                    '&:hover': { bgcolor: baseline === b ? pal.accent : pal.toggleHover },
                  }}
                >
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    <Box component="img" src={`https://flagcdn.com/w40/${b === 'US' ? 'us' : 'gb'}.png`} alt="" sx={{ width: 18, height: 13, objectFit: 'cover', borderRadius: '2px', display: 'block' }} />
                    {b === 'US' ? 'US' : 'UK'}
                  </Box>
                </Button>
              ))}
            </Box>
          </Box>

          {/* Priority toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                      Balances incentives, currency advantages, and cost efficiency for total net savings
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
              <IconButton sx={{ color: pal.accent, width: '32px', height: '32px', '&:hover': { bgcolor: 'rgba(245,200,0,0.1)' } }}>
                <InfoOutlined sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <Box sx={{ bgcolor: pal.toggleBg, border: `1px solid ${pal.toggleBorder}`, borderRadius: '10px', p: '3px', display: 'flex', gap: '2px' }}>
              {(['incentive', 'full', 'location'] as const).map((p) => (
                <Button
                  key={p}
                  onClick={() => setPriority(p)}
                  sx={{
                    bgcolor: priority === p ? pal.accent : 'transparent',
                    color: priority === p ? pal.accentText : pal.toggleInactive,
                    fontFamily: font,
                    fontWeight: priority === p ? 700 : 400,
                    fontSize: '13px', px: 2.25, py: 0.9, whiteSpace: 'nowrap',
                    borderRadius: '8px', textTransform: 'none', minWidth: 'auto', lineHeight: 1.2,
                    '&:hover': { bgcolor: priority === p ? pal.accent : pal.toggleHover },
                  }}
                >
                  {p === 'incentive' ? 'Maximise Incentive' : p === 'full' ? 'Full Picture' : 'Location First'}
                </Button>
              ))}
            </Box>
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

        {/* Locked results preview for free users */}
        {!hasAccess && (
          <ResultsGate plan="professional" featureName="What If Calculator">
            <Box
              sx={{
                bgcolor: pal.cardBg, borderRadius: '12px',
                border: `1px solid ${pal.cardBorder}`,
                boxShadow: pal.cardShadow,
                overflow: 'hidden',
              }}
            >
              {/* Preview header row */}
              <Box
                sx={{
                  display: 'flex', bgcolor: pal.headStripe,
                  height: '44px', alignItems: 'center', px: 2,
                  borderBottom: `1px solid ${pal.rowBorder}`,
                  minWidth: '1320px', gap: 2,
                }}
              >
                {['Territory', 'Programme', 'Incentive Rate', 'Est. Incentive', 'Currency Adv.', 'NET SAVING', 'Min Spend', 'Payment', 'Score /100'].map((col) => (
                  <Box key={col} sx={{ flex: col === 'Territory' ? '0 0 200px' : '0 0 120px' }}>
                    <Typography sx={{ ...headerCellSx }}>{col}</Typography>
                  </Box>
                ))}
              </Box>
              {/* Preview placeholder rows */}
              {[1, 2, 3, 4].map((i) => (
                <Box
                  key={i}
                  sx={{
                    display: 'flex', alignItems: 'center', px: 2,
                    minHeight: '52px', borderBottom: `1px solid ${pal.rowBorder}`,
                    bgcolor: i % 2 === 0 ? pal.rowAlt : pal.rowBase, minWidth: '1320px', gap: 2,
                  }}
                >
                  <Box sx={{ flex: '0 0 200px', height: 14, bgcolor: pal.skeleton, borderRadius: 1 }} />
                  {[120, 80, 110, 110, 110, 90, 100, 70].map((w, j) => (
                    <Box key={j} sx={{ flex: `0 0 ${w}px`, height: 12, bgcolor: pal.skeleton2, borderRadius: 1 }} />
                  ))}
                </Box>
              ))}
            </Box>
          </ResultsGate>
        )}

        {/* Territory Comparison Table */}
        {hasAccess && territories.length > 0 && (
          <Box
            sx={{
              bgcolor: pal.cardBg, borderRadius: '12px',
              border: `1px solid ${pal.cardBorder}`,
              boxShadow: pal.cardShadow,
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
                  bgcolor: pal.overlay,
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

            {/* Scrollable table — capped to ~10 rows so the calculator sits in
                its own scroll container rather than stretching the whole page.
                The header pins to the top of that container while rows scroll. */}
            <Box sx={{ overflowX: 'auto', ...(embedded ? { maxHeight: 560, overflowY: 'auto' } : {}) }}>
            {/* Header Row */}
            <Box
              sx={{
                display: 'flex', bgcolor: embedded ? '#17140c' : pal.headStripe,
                height: '44px', alignItems: 'center', px: 2,
                borderBottom: `1px solid ${pal.rowBorder}`,
                minWidth: '1420px',
                ...(embedded ? { position: 'sticky', top: 0, zIndex: 2 } : {}),
              }}
            >
              <Box sx={{ width: '200px' }}><Typography sx={headerCellSx}>Territory</Typography></Box>
              <Box sx={{ width: '140px' }}><Typography sx={headerCellSx}>Programme</Typography></Box>
              <Box sx={{ width: '110px' }}><Typography sx={headerCellSx}>Incentive Rate</Typography></Box>
              <Box sx={{ width: '110px' }}>
                <Tooltip title="BANKABLE = accepted by most gap lenders as collateral. VERIFY FIRST = confirm before investor documents. CAUTION = unreliable payment or programme unstable." placement="top" arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                    <Typography sx={headerCellSx}>Bankability</Typography>
                    <InfoOutlined sx={{ fontSize: '12px', color: '#D4AF37', opacity: 0.7 }} />
                  </Box>
                </Tooltip>
              </Box>
              <Box sx={{ width: '100px' }}>
                <Tooltip title="Financial Return Score: measures incentive strength + bankability. Bankable (≥70) / Verify First (45 to 69) / Caution (<45 or NOT BANKABLE)." placement="top" arrow>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                    <Typography sx={headerCellSx}>FRS /100</Typography>
                    <InfoOutlined sx={{ fontSize: '12px', color: '#D4AF37', opacity: 0.7 }} />
                  </Box>
                </Tooltip>
              </Box>
              <Box sx={{ width: '140px' }}><Typography sx={headerCellSx}>Est. Incentive</Typography></Box>
              <Box sx={{ width: '140px' }}><Tooltip title="Estimated from territory score. Upload script for exact figures." placement="top"><Typography sx={headerCellSx}>~ Currency Adv.</Typography></Tooltip></Box>
              <Box sx={{ width: '140px' }}><Typography sx={headerCellSx}>NET SAVING</Typography></Box>
              <Box sx={{ width: '110px' }}><Typography sx={headerCellSx}>Min Spend</Typography></Box>
              <Box sx={{ width: '120px' }}><Typography sx={headerCellSx}>Payment</Typography></Box>
              <Box sx={{ width: '80px' }}>
                <Tooltip
                  title={scoreTooltipContent}
                  placement="left"
                  arrow
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: '#1E2330', border: '1px solid rgba(245,200,0,0.3)',
                        borderRadius: '8px', maxWidth: '320px',
                        '& .MuiTooltip-arrow': { color: '#1E2330', '&::before': { border: '1px solid rgba(245,200,0,0.3)' } },
                      },
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'default' }}>
                    <Typography sx={headerCellSx}>Score /100</Typography>
                    <InfoOutlined sx={{ fontSize: '12px', color: '#D4AF37', opacity: 0.7 }} />
                  </Box>
                </Tooltip>
              </Box>
            </Box>

            {/* Body rows */}
            <Box>
              {/* Data Rows */}
              {territories.map((t, index) => {
                const caVal = caValue(t);
                const isTopScore = index === 0;

                return (
                  <Box
                    key={t.territory}
                    sx={{
                      display: 'flex',
                      bgcolor: index % 2 === 0 ? pal.rowBase : pal.rowAlt,
                      minHeight: '52px', alignItems: 'center', px: 2,
                      borderBottom: `1px solid ${pal.rowBorder}`,
                      minWidth: '1420px',
                      '&:hover': { bgcolor: pal.rowHover },
                    }}
                  >
                    {/* Territory */}
                    <Box sx={{ width: '200px', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontSize: '18px' }}>{isoToFlag(t.iso)}</Typography>
                      <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: pal.value }}>
                        {t.territory}
                      </Typography>
                      {isTopScore && (
                        <Chip
                          label="TOP"
                          sx={{
                            bgcolor: pal.accent, color: pal.accentText,
                            fontFamily: font, fontWeight: 700, fontSize: '10px',
                            height: '20px', textTransform: 'uppercase', borderRadius: '10px',
                          }}
                        />
                      )}
                    </Box>

                    {/* Programme */}
                    <Box sx={{ width: '140px' }}>
                      <Tooltip title={t.programme_note || ''} disableHoverListener={!t.programme_note}>
                        <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '13px', color: pal.subtext }}>
                          {t.programme}
                        </Typography>
                      </Tooltip>
                    </Box>

                    {/* Rate */}
                    <Box sx={{ width: '110px' }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: pal.value }}>
                        {t.rate_display}
                      </Typography>
                    </Box>

                    {/* Bankability */}
                    <Box sx={{ width: '110px' }}>
                      {t.bankability_label ? (
                        <Chip label={t.bankability_label} size="small" sx={{
                          height: 22, fontSize: '10px', fontWeight: 700, fontFamily: font,
                          bgcolor: t.bankability_label === 'BANKABLE' ? 'rgba(26,140,78,0.12)' :
                                   t.bankability_label === 'VERIFY FIRST' ? 'rgba(177,119,13,0.12)' :
                                   'rgba(192,57,43,0.12)',
                          color: t.bankability_label === 'BANKABLE' ? '#1A8C4E' :
                                 t.bankability_label === 'VERIFY FIRST' ? '#B7770D' : '#C0392B',
                          border: '1px solid currentColor',
                        }} />
                      ) : <Typography sx={{ fontFamily: font, fontSize: '14px', color: pal.muted }}>N/A</Typography>}
                    </Box>

                    {/* FRS */}
                    <Box sx={{ width: '100px' }}>
                      {t.financial_return_score != null ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px',
                            color: t.financial_return_verdict === 'Bankable' ? '#1A8C4E' :
                                   t.financial_return_verdict === 'Verify First' ? '#B7770D' : '#C0392B' }}>
                            {t.financial_return_score}
                            <Typography component="span" sx={{ fontWeight: 400, fontSize: '11px', color: pal.muted }}>/100</Typography>
                          </Typography>
                          <Typography sx={{ fontFamily: font, fontSize: '10px', fontWeight: 600,
                            color: t.financial_return_verdict === 'Bankable' ? '#1A8C4E' :
                                   t.financial_return_verdict === 'Verify First' ? '#B7770D' : '#C0392B' }}>
                            {t.financial_return_verdict}
                          </Typography>
                        </Box>
                      ) : <Typography sx={{ fontFamily: font, fontSize: '14px', color: pal.muted }}>N/A</Typography>}
                    </Box>

                    {/* Est. Incentive */}
                    <Box sx={{ width: '140px' }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: '#1A8C4E' }}>
                        {t.estimated_rebate_display}
                      </Typography>
                      {t.vfx_uplift_display && (
                        <Typography sx={{ fontFamily: font, fontSize: '10px', color: pal.muted, fontStyle: 'italic' }}>
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
                        <Typography sx={{ fontFamily: font, fontSize: '14px', color: pal.muted }}>N/A</Typography>
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
                      <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '13px', color: pal.subtext }}>
                        {t.min_spend || '\u2014'}
                      </Typography>
                    </Box>

                    {/* Payment */}
                    <Box sx={{ width: '120px' }}>
                      <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '13px', color: pal.subtext }}>
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
                        {t.overall_score}<Typography component="span" sx={{ fontFamily: font, fontWeight: 400, fontSize: '11px', color: pal.muted }}>/100</Typography>
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
}
