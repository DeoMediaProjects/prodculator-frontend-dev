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
import { InfoOutlined, LockOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { DataTable } from '@/app/components/user/b2c/DataTable';
import logoBlack from '@/assets/ddbe9f875b0128308d18010a516a1a848d4b7b77.png';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';
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
// Free-plan gating: preview the top 5 ranked territories, blur the rest behind
// an upgrade CTA; only the two headline currencies are selectable.
const FREE_VISIBLE = 5;
const FREE_CURRENCIES = ['USD', 'GBP'] as const;
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
  const navigate = useNavigate();
  // Free plan (no professional access) sees a gated preview: 5 territories,
  // Maximise Incentive only, USD/GBP only.
  const isFree = !hasAccess;
  const currencyOptions = isFree ? FREE_CURRENCIES : CURRENCIES;

  // Inputs
  const [budget, setBudget] = useState(4_000_000);
  const [budgetCurrency, setBudgetCurrency] = useState('GBP');
  const [vfxAllocation, setVfxAllocation] = useState(0);
  const [priority, setPriority] = useState<'incentive' | 'full' | 'location'>('full');
  // Free users are locked to Maximise Incentive regardless of the toggle state.
  const effPriority: 'incentive' | 'full' | 'location' = isFree ? 'incentive' : priority;
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
        production_priority: effPriority,
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
  const scoreWeights = SCORE_WEIGHTS_INFO[effPriority];
  const scoreTooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '12px', mb: 1.5, color: '#F5C800' }}>
        Score out of 100
      </Typography>
      <Typography sx={{ fontSize: '11px', color: '#A0A7B8', mb: 1.5, lineHeight: 1.5 }}>
        Weighted across 6 dimensions for <strong style={{ color: '#fff' }}>
          {effPriority === 'incentive' ? 'Maximise Incentive' : effPriority === 'full' ? 'Full Picture' : 'Location First'}
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
  // Export is a paid feature — free users see the upgrade CTA over the results
  // instead, so no export button is registered for them.
  useHeaderActions(
    embedded && !isFree ? (
      <Button variant="outlined" onClick={handleExport} disabled={!territories.length} sx={{ whiteSpace: 'nowrap' }}>
        Export to CSV
      </Button>
    ) : null,
    [embedded, isFree, territories.length],
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
                  {currencyOptions.map((c) => (
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
            <SegmentedToggle
              value={baseline}
              onChange={(v) => setBaseline(v as 'US' | 'GB')}
              fontFamily={font}
              palette={{ bg: pal.toggleBg, border: pal.toggleBorder, activeBg: pal.accent, activeText: pal.accentText, inactiveText: pal.toggleInactive }}
              options={(['US', 'GB'] as const).map((b) => ({
                value: b,
                label: (
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    <Box component="img" src={`https://flagcdn.com/w40/${b === 'US' ? 'us' : 'gb'}.png`} alt="" sx={{ width: 18, height: 13, objectFit: 'cover', borderRadius: '2px', display: 'block' }} />
                    {b === 'US' ? 'US' : 'UK'}
                  </Box>
                ),
              }))}
            />
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
            <SegmentedToggle
              value={effPriority}
              onChange={(v) => setPriority(v as 'incentive' | 'full' | 'location')}
              onLocked={() => navigate('/pricing')}
              fontFamily={font}
              palette={{ bg: pal.toggleBg, border: pal.toggleBorder, activeBg: pal.accent, activeText: pal.accentText, inactiveText: pal.toggleInactive }}
              options={[
                { value: 'incentive', label: 'Maximise Incentive' },
                { value: 'full', label: 'Full Picture', locked: isFree, lockedHint: 'Upgrade to unlock Full Picture & Location First' },
                { value: 'location', label: 'Location First', locked: isFree, lockedHint: 'Upgrade to unlock Full Picture & Location First' },
              ]}
            />
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

        {/* Territory Comparison Table. Free users see a 5-row gated preview (the
            blurred bespoke card); paid users get the readable, filterable grid. */}
        {territories.length > 0 && (isFree ? (
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

            {/* Body rows — scrollable; free users get a 5-row preview, rest blurred */}
            <Box sx={{ maxHeight: isFree ? 330 : 560, overflowY: isFree ? 'hidden' : 'auto' }}>
              {/* Data Rows */}
              {territories.map((t, index) => {
                const caVal = caValue(t);
                const locked = isFree && index >= FREE_VISIBLE;
                const isTopScore = index === 0 && !isFree;

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
                      ...(locked ? { filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' } : {}),
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
            {isFree && territories.length > FREE_VISIBLE && (
              <Box
                sx={{
                  position: 'absolute', left: 0, right: 0, bottom: 0, height: '58%', zIndex: 6,
                  pointerEvents: 'none', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center', pb: 2, px: 2,
                  background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${pal.cardBg} 42%)`,
                }}
              >
                <LockOutlined sx={{ color: pal.accent, fontSize: 28 }} />
                <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '15px', color: pal.value, mt: 1 }}>
                  {territories.length - FREE_VISIBLE} more territories
                </Typography>
                <Typography sx={{ fontFamily: font, fontSize: '13px', color: pal.subtext, maxWidth: 380, mt: 0.5 }}>
                  Upgrade to gain access to more territories, unlock every currency and scoring mode, and export your results.
                </Typography>
                <Button
                  variant="contained"
                  onClick={() => navigate('/pricing')}
                  sx={{ pointerEvents: 'auto', mt: 1.5, bgcolor: pal.accent, color: pal.accentText, fontFamily: font, fontWeight: 700, fontSize: '13px', height: '40px', px: 3, borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: pal.accent, opacity: 0.9 } }}
                >
                  Upgrade to unlock →
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ mb: 4 }}>
            <DataTable<TerritoryScenario>
              rows={territories}
              getRowId={(t2) => t2.territory}
              minWidth={1680}
              maxHeight={embedded ? 560 : 640}
              columns={[
                { key: 'territory', header: 'TERRITORY', width: '190px', render: (t2) => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '18px' }}>{isoToFlag(t2.iso)}</Typography>
                    <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: pal.value }}>{t2.territory}</Typography>
                  </Box>
                ) },
                { key: 'programme', header: 'PROGRAMME', width: '240px', render: (t2) => (
                  <Typography noWrap title={t2.programme_note || t2.programme || ''} sx={{ fontFamily: font, fontSize: '13px', color: pal.subtext }}>{t2.programme}</Typography>
                ) },
                { key: 'rate_display', header: 'INCENTIVE RATE', width: '170px', render: (t2) => <Typography noWrap title={t2.rate_display || ''} sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: pal.value }}>{t2.rate_display}</Typography> },
                { key: 'bankability_label', header: 'BANKABILITY', width: '120px', render: (t2) => (
                  t2.bankability_label
                    ? <Chip label={t2.bankability_label} size="small" sx={{ height: 22, fontSize: '10px', fontWeight: 700, fontFamily: font, bgcolor: t2.bankability_label === 'BANKABLE' ? 'rgba(26,140,78,0.12)' : t2.bankability_label === 'VERIFY FIRST' ? 'rgba(177,119,13,0.12)' : 'rgba(192,57,43,0.12)', color: t2.bankability_label === 'BANKABLE' ? '#1A8C4E' : t2.bankability_label === 'VERIFY FIRST' ? '#B7770D' : '#C0392B', border: '1px solid currentColor' }} />
                    : <Typography sx={{ fontFamily: font, fontSize: '14px', color: pal.muted }}>N/A</Typography>
                ) },
                { key: 'financial_return_score', header: 'FRS /100', width: '100px', sortValue: (t2) => t2.financial_return_score ?? -1, render: (t2) => (
                  t2.financial_return_score != null
                    ? <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: t2.financial_return_verdict === 'Bankable' ? '#1A8C4E' : t2.financial_return_verdict === 'Verify First' ? '#B7770D' : '#C0392B' }}>{t2.financial_return_score}<Typography component="span" sx={{ fontWeight: 400, fontSize: '11px', color: pal.muted }}>/100</Typography></Typography>
                    : <Typography sx={{ fontFamily: font, fontSize: '14px', color: pal.muted }}>N/A</Typography>
                ) },
                { key: 'estimated_rebate_display', header: 'EST. INCENTIVE', width: '140px', render: (t2) => <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: '#1A8C4E' }}>{t2.estimated_rebate_display}{t2.vfx_uplift_display ? ` (+${t2.vfx_uplift_display} VFX)` : ''}</Typography> },
                { key: 'currency_advantage', header: '~ CURRENCY ADV.', width: '140px', sortValue: (t2) => caValue(t2), render: (t2) => {
                  const cv = caValue(t2);
                  return cv !== 0
                    ? <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: valueColor(cv) }}>{cv > 0 ? '+' : ''}{formatLargeNumber(Math.round(cv), sym)}</Typography>
                    : <Typography sx={{ fontFamily: font, fontSize: '14px', color: pal.muted }}>N/A</Typography>;
                } },
                { key: 'net_saving_display', header: 'NET SAVING', width: '140px', render: (t2) => <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '15px', color: '#D4AF37' }}>{t2.net_saving_display}</Typography> },
                { key: 'min_spend', header: 'MIN SPEND', width: '140px', render: (t2) => <Typography sx={{ fontFamily: font, fontSize: '13px', color: pal.subtext }}>{t2.min_spend || '—'}</Typography> },
                { key: 'payment_timeline', header: 'PAYMENT', width: '200px', render: (t2) => <Tooltip title={t2.payment_timeline || ''}><Typography sx={{ fontFamily: font, fontSize: '13px', color: pal.subtext }}>{t2.payment_timeline || '—'}</Typography></Tooltip> },
                { key: 'overall_score', header: 'SCORE /100', width: '100px', render: (t2) => <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: t2.overall_score >= 60 ? '#1A8C4E' : t2.overall_score >= 40 ? '#D4AF37' : '#999' }}>{t2.overall_score}<Typography component="span" sx={{ fontWeight: 400, fontSize: '11px', color: pal.muted }}>/100</Typography></Typography> },
              ]}
            />
          </Box>
        ))}
      </Container>
    </Box>
  );
}
