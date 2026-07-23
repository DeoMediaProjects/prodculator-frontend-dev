import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Slider,
  IconButton,
  Tooltip,
  Alert,
  Select,
  MenuItem,
  type SelectChangeEvent,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { InfoOutlined, LockOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';
import {
  computeScenario,
  type ScenarioResponse,
  type TerritoryScenario,
} from '@/services/calculator.service';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { usePlanGate } from '@/app/hooks/usePlanGate';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { SiteFooter } from '@/app/components/common/SiteFooter';
import { PageHeader } from '@/app/components/common/PageHeader';

// ── ISO → flag emoji ──────────────────────────────────────────────────────────
const FLAG_FALLBACK = '\u{1F3AC}';
function isoToFlag(iso: string | null): string {
  if (!iso || iso.length !== 2) return FLAG_FALLBACK;
  const codePoints = [...iso.toUpperCase()].map(
    (c) => 0x1f1e6 - 65 + c.charCodeAt(0),
  );
  return String.fromCodePoint(...codePoints);
}

// ── Currency symbols ──────────────────────────────────────────────────────────
const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', ZAR: 'R', CAD: 'C$', AUD: 'A$',
  NGN: '₦', HUF: 'Ft', CZK: 'Kč', MAD: 'MAD', NZD: 'NZ$',
  RON: 'RON', RSD: 'RSD',
};

// This page requires login (see the ProtectedRoute wrapping /what-if in
// App.tsx); gating below is by plan, matching the dashboard WhatIfCalculator.
const FREE_CURRENCIES = ['USD', 'GBP'] as const;
const ALL_CURRENCIES = ['GBP', 'USD', 'EUR', 'CAD', 'AUD', 'ZAR'] as const;
// Free-plan users preview this many territories; the remainder are blurred
// behind an upgrade CTA. Paid plans see every territory.
const FREE_VISIBLE = 5;
const FORMATS = [
  'Feature Film', 'TV Series', 'Limited Series', 'Documentary',
  'Short Film', 'Animation', 'Animated Feature', 'Mini Series',
  'Docuseries', 'Animation Series',
] as const;

function formatCurrencyLabel(amount: number, symbol: string): string {
  if (amount >= 1_000_000) return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${symbol}${(amount / 1_000).toFixed(0)}K`;
  return `${symbol}${amount.toFixed(0)}`;
}

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

export function PublicWhatIfCalculator() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { isFree } = usePlanGate();

  // Inputs
  const [budget, setBudget] = useState(4_000_000);
  const [budgetCurrency, setBudgetCurrency] = useState('GBP');
  const [vfxAllocation, setVfxAllocation] = useState(0);
  const [priority, setPriority] = useState<'incentive' | 'full' | 'location'>('incentive');
  // Free-plan users are locked to Maximise Incentive regardless of the toggle state.
  const effPriority: 'incentive' | 'full' | 'location' = isFree ? 'incentive' : priority;
  const [format, setFormat] = useState('Feature Film');
  const [baseline, setBaseline] = useState<'GB' | 'US'>('US');

  // API response
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sym = CURRENCY_SYMBOLS[budgetCurrency] || budgetCurrency + ' ';
  const currencyOptions = isFree ? FREE_CURRENCIES : ALL_CURRENCIES;

  const fetchScenario = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

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
    }, DEBOUNCE_MS);
  }, [budget, budgetCurrency, vfxAllocation, effPriority, format, baseline]);

  useEffect(() => {
    fetchScenario();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchScenario]);

  const territories: TerritoryScenario[] = scenario?.territories ?? [];

  // ── Shared styles (theme-dependent, so defined per render) ────────────────
  const headerCellSx = {
    fontWeight: 700,
    fontSize: '11px',
    color: t.gold,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  };

  const sliderSx = {
    color: t.gold,
    height: 6,
    '& .MuiSlider-track': { bgcolor: t.gold, border: 'none' },
    '& .MuiSlider-rail': { bgcolor: t.border },
    '& .MuiSlider-thumb': {
      bgcolor: t.gold, width: 20, height: 20,
      border: `3px solid ${t.cardBg}`,
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
      '&:hover, &.Mui-focusVisible': { boxShadow: `0 0 0 8px ${t.goldDim}` },
    },
  };

  const selectSx = {
    fontWeight: 600, fontSize: '13px', color: t.textPrimary,
    height: '36px',
    '& .MuiOutlinedInput-notchedOutline': { borderColor: t.border },
    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: t.gold },
    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: t.gold },
  };

  // ── Score tooltip content ─────────────────────────────────────────────────
  const scoreWeights = SCORE_WEIGHTS_INFO[effPriority];
  const scoreTooltipContent = (
    <Box sx={{ p: 1 }}>
      <Typography sx={{ fontWeight: 700, fontSize: '12px', mb: 1.5, color: t.gold }}>
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
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: t.gold, flexShrink: 0 }}>
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

  // ── Plan gating: free plan previews FREE_VISIBLE territories, the rest
  // blurred behind an upgrade CTA. Paid plans see every territory.
  const visibleTerritories = isFree ? territories.slice(0, FREE_VISIBLE) : territories;
  const lockedTerritories = isFree ? territories.slice(FREE_VISIBLE) : [];

  const renderDesktopRow = (terr: TerritoryScenario, index: number) => (
    <Box
      key={terr.territory}
      sx={{
        display: 'flex', bgcolor: index % 2 === 0 ? t.cardBg : t.cardBgAlt,
        minHeight: '52px', alignItems: 'center', px: 2,
        borderBottom: `1px solid ${t.borderSoft}`, minWidth: '720px',
        '&:hover': { bgcolor: t.goldDim },
      }}
    >
      <Box sx={{ width: '220px', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: '18px' }}>{isoToFlag(terr.iso)}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: '14px', color: t.textPrimary }}>{terr.territory}</Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: '160px' }}>
        <Tooltip title={terr.programme_note || ''} disableHoverListener={!terr.programme_note}>
          <Typography sx={{ fontWeight: 400, fontSize: '13px', color: t.textSecondary }}>{terr.programme}</Typography>
        </Tooltip>
      </Box>
      <Box sx={{ width: '120px' }}>
        <Typography sx={{ fontWeight: 600, fontSize: '14px', color: t.textPrimary }}>{terr.rate_display}</Typography>
      </Box>
      <Box sx={{ width: '160px' }}>
        <Typography sx={{ fontWeight: 600, fontSize: '14px', color: t.success }}>{terr.estimated_rebate_display}</Typography>
        {terr.vfx_uplift_display && (
          <Typography sx={{ fontSize: '10px', color: t.textFaint, fontStyle: 'italic' }}>+{terr.vfx_uplift_display} VFX</Typography>
        )}
      </Box>
      <Box sx={{ width: '80px' }}>
        <Typography sx={{ fontWeight: 700, fontSize: '14px', color: terr.overall_score >= 60 ? t.success : terr.overall_score >= 40 ? t.gold : t.textFaint }}>
          {terr.overall_score}<Typography component="span" sx={{ fontWeight: 400, fontSize: '11px', color: t.textFaint }}>/100</Typography>
        </Typography>
      </Box>
    </Box>
  );

  const renderMobileCard = (terr: TerritoryScenario) => {
    const cells = [
      { label: 'Programme', value: terr.programme, valueColor: t.textPrimary },
      { label: 'Incentive Rate', value: terr.rate_display, valueColor: t.textPrimary },
      { label: 'Est. Incentive', value: terr.vfx_uplift_display ? `${terr.estimated_rebate_display} (+${terr.vfx_uplift_display} VFX)` : terr.estimated_rebate_display, valueColor: t.success },
    ];
    return (
      <Box key={terr.territory} sx={{ border: `1px solid ${t.border}`, borderRadius: '10px', p: 2, mb: 1.5, bgcolor: t.cardBg }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography sx={{ fontSize: '20px' }}>{isoToFlag(terr.iso)}</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '15px', color: t.textPrimary, flex: 1 }}>{terr.territory}</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '15px', color: terr.overall_score >= 60 ? t.success : terr.overall_score >= 40 ? t.gold : t.textFaint }}>
            {terr.overall_score}<Typography component="span" sx={{ fontWeight: 400, fontSize: '11px', color: t.textFaint }}>/100</Typography>
          </Typography>
        </Box>
        {cells.map((cell) => (
          <Box key={cell.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5, borderTop: `1px solid ${t.borderSoft}` }}>
            <Typography sx={{ fontWeight: 400, fontSize: '12px', color: t.textFaint }}>{cell.label}</Typography>
            <Typography sx={{ fontWeight: 600, fontSize: '13px', color: cell.valueColor, textAlign: 'right' }}>{cell.value}</Typography>
          </Box>
        ))}
      </Box>
    );
  };

  // Overlay CTA drawn over the blurred locked rows.
  const lockedCTA = lockedTerritories.length > 0 && (
    <Box
      sx={{
        position: 'absolute', inset: 0, zIndex: 5,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, px: 2, textAlign: 'center',
        background: `linear-gradient(180deg, ${alpha(t.cardBg, 0)} 0%, ${alpha(t.cardBg, 0.85)} 35%, ${t.cardBg} 100%)`,
      }}
    >
      <LockOutlined sx={{ color: t.gold, fontSize: '28px' }} />
      <Typography sx={{ fontWeight: 700, fontSize: '15px', color: t.textPrimary }}>
        {lockedTerritories.length} more territories
      </Typography>
      <Typography sx={{ fontSize: '13px', color: t.textSecondary, maxWidth: 360 }}>
        Upgrade your plan to compare all {territories.length} territories, unlock every currency, and switch scoring modes.
      </Typography>
      <Button variant="contained" onClick={() => navigate('/pricing')} sx={{ height: '38px', px: 2.5, mt: 0.5 }}>Upgrade Plan →</Button>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh' }}>
      {/* Every visitor here is authenticated (route-level ProtectedRoute),
          so PageHeader will always show the account menu, never Log In/Sign Up. */}
      <PageHeader />

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 5 } }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontWeight: 700, fontSize: { xs: '20px', sm: '28px' }, color: t.textPrimary, mb: 1 }}>
            What If Calculator
          </Typography>
          <Typography sx={{ fontWeight: 400, fontSize: { xs: '13px', sm: '15px' }, color: t.textSecondary }}>
            Compare incentive returns across {territories.length || '...'} territories at your budget
          </Typography>
        </Box>

        {/* Controls Card */}
        <Box
          sx={{
            bgcolor: t.cardBg, borderRadius: '12px',
            border: `1px solid ${t.border}`,
            p: { xs: 2, sm: 4 }, mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 }, flexWrap: 'wrap' }}>
            {/* Budget Slider */}
            <Box sx={{ flex: 1, minWidth: '240px' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '11px', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                Total Production Budget
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '22px', color: t.textPrimary }}>
                  {formatCurrencyLabel(budget, sym)}
                </Typography>
                <Select
                  value={budgetCurrency}
                  onChange={(e: SelectChangeEvent) => setBudgetCurrency(e.target.value)}
                  size="small"
                  sx={{ ...selectSx, minWidth: '80px' }}
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
                sx={sliderSx}
              />
              <Typography sx={{ fontWeight: 400, fontSize: '11px', color: t.textFaint, mt: 1 }}>
                Range: {sym}500K to {sym}50M
              </Typography>
            </Box>

            {/* VFX Slider */}
            <Box sx={{ flex: 1, minWidth: '240px' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '11px', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
                VFX Budget Allocation
              </Typography>
              <Typography sx={{ fontWeight: 700, fontSize: '22px', color: t.textPrimary, mb: 2 }}>
                {vfxAllocation}%
              </Typography>
              <Slider
                value={vfxAllocation}
                onChange={(_, value) => setVfxAllocation(value as number)}
                min={0} max={60} step={1}
                sx={sliderSx}
              />
              <Typography sx={{ fontWeight: 400, fontSize: '11px', color: t.textFaint, mt: 1, fontStyle: 'italic' }}>
                Applies supplementary VFX credits where available
              </Typography>
            </Box>

            {/* Format selector */}
            <Box sx={{ minWidth: '180px' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '11px', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1 }}>
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

        {/* Production Priority & Baseline Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {/* Baseline toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '11px', color: t.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Baseline
            </Typography>
            <SegmentedToggle
              radius={9999}
              value={baseline}
              onChange={(v) => setBaseline(v as 'US' | 'GB')}
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
                  <Typography sx={{ fontWeight: 700, fontSize: '13px', mb: 1, color: t.gold }}>
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
              <IconButton sx={{ color: t.gold, width: '32px', height: '32px', '&:hover': { bgcolor: t.goldDim } }}>
                <InfoOutlined sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <SegmentedToggle
              radius={9999}
              value={effPriority}
              onChange={(v) => setPriority(v as 'incentive' | 'full' | 'location')}
              onLocked={() => navigate('/pricing')}
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

        {/* Territory Comparison Table */}
        {territories.length > 0 && (
          <Box
            sx={{
              bgcolor: t.cardBg, borderRadius: '12px',
              border: `1px solid ${t.border}`,
              overflow: 'hidden', mb: 4,
              position: 'relative',
            }}
          >
            {/* Loading overlay */}
            {loading && scenario && (
              <Box
                sx={{
                  position: 'absolute', inset: 0,
                  bgcolor: alpha(t.cardBg, 0.7),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 10, borderRadius: '12px', pointerEvents: 'all',
                }}
              >
                <LoadingSpinner size={36} message="Recalculating..." />
              </Box>
            )}

            <Box sx={{ overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
              {/* Header Row */}
              <Box
                sx={{
                  display: 'flex', bgcolor: t.goldDim,
                  height: '44px', alignItems: 'center', px: 2,
                  borderBottom: `1px solid ${t.borderSoft}`,
                  minWidth: '720px',
                }}
              >
                <Box sx={{ width: '220px' }}><Typography sx={headerCellSx}>Territory</Typography></Box>
                <Box sx={{ flex: 1, minWidth: '160px' }}><Typography sx={headerCellSx}>Programme</Typography></Box>
                <Box sx={{ width: '120px' }}><Typography sx={headerCellSx}>Incentive Rate</Typography></Box>
                <Box sx={{ width: '160px' }}><Typography sx={headerCellSx}>Est. Incentive</Typography></Box>
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
                      <InfoOutlined sx={{ fontSize: '12px', color: t.gold, opacity: 0.7 }} />
                    </Box>
                  </Tooltip>
                </Box>
              </Box>

              {/* Body rows — 1 random territory open, a short blurred strip behind the CTA */}
              <Box>
                {visibleTerritories.map((terr, index) => renderDesktopRow(terr, index))}
                {lockedTerritories.length > 0 && (
                  <Box sx={{ position: 'relative', maxHeight: 210, overflow: 'hidden' }}>
                    <Box sx={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }} aria-hidden>
                      {lockedTerritories.slice(0, 4).map((terr, index) => renderDesktopRow(terr, FREE_VISIBLE + index))}
                    </Box>
                    {lockedCTA}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Mobile card view — 1 random territory open, a short blurred strip behind the CTA */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1.5 }}>
              {visibleTerritories.map((terr) => renderMobileCard(terr))}
              {lockedTerritories.length > 0 && (
                <Box sx={{ position: 'relative', maxHeight: 260, overflow: 'hidden' }}>
                  <Box sx={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }} aria-hidden>
                    {lockedTerritories.slice(0, 2).map((terr) => renderMobileCard(terr))}
                  </Box>
                  {lockedCTA}
                </Box>
              )}
            </Box>
          </Box>
        )}

      </Container>

      <SiteFooter />
    </Box>
  );
}
