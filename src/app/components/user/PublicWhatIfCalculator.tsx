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
import { InfoOutlined, ArrowBack, LockOutlined } from '@mui/icons-material';
import { useNavigate } from 'react-router';
import { LoadingSpinner } from '@/app/components/common/LoadingSpinner';
import {
  computeScenario,
  type ScenarioResponse,
  type TerritoryScenario,
} from '@/services/calculator.service';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';

// Fixed light palette for the always-light public page (independent of theme mode).
const PUBLIC_TOGGLE_PAL = { bg: '#FFFFFF', border: 'rgba(0,0,0,0.08)', activeBg: '#F5C800', activeText: '#000000', inactiveText: '#999999' };

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
  GBP: '\u00a3', USD: '$', EUR: '\u20ac', ZAR: 'R', CAD: 'C$', AUD: 'A$',
  NGN: '\u20a6', HUF: 'Ft', CZK: 'K\u010d', MAD: 'MAD', NZD: 'NZ$',
  RON: 'RON', RSD: 'RSD',
};

// Guests only get the two headline currencies; the rest unlock on sign-up.
const CURRENCIES = ['USD', 'GBP'] as const;
// Guests preview the top 5 ranked territories; the remainder are blurred behind
// a sign-up CTA.
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

  // Inputs
  const [budget, setBudget] = useState(4_000_000);
  const [budgetCurrency, setBudgetCurrency] = useState('GBP');
  const [vfxAllocation, setVfxAllocation] = useState(0);
  // Guests are locked to Maximise Incentive; Full Picture / Location First
  // unlock on sign-up.
  const [priority] = useState<'incentive' | 'full' | 'location'>('incentive');
  const [format, setFormat] = useState('Feature Film');
  const [baseline, setBaseline] = useState<'GB' | 'US'>('US');

  // API response
  const [scenario, setScenario] = useState<ScenarioResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sym = CURRENCY_SYMBOLS[budgetCurrency] || budgetCurrency + ' ';

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
        production_priority: priority,
        baseline,
      });

      if (err) {
        setError(err);
      } else if (data) {
        setScenario(data);
      }
      setLoading(false);
    }, DEBOUNCE_MS);
  }, [budget, budgetCurrency, vfxAllocation, priority, format, baseline]);

  useEffect(() => {
    fetchScenario();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchScenario]);

  const territories: TerritoryScenario[] = scenario?.territories ?? [];

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

  // ── Guest gating: preview 5 territories, blur the rest behind a CTA ─────────
  const visibleTerritories = territories.slice(0, FREE_VISIBLE);
  const lockedTerritories = territories.slice(FREE_VISIBLE);

  const renderDesktopRow = (t: TerritoryScenario, index: number) => (
    <Box
      key={t.territory}
      sx={{
        display: 'flex', bgcolor: index % 2 === 0 ? '#FFFFFF' : '#FAFAF8',
        minHeight: '52px', alignItems: 'center', px: 2,
        borderBottom: '1px solid rgba(0,0,0,0.04)', minWidth: '720px',
        '&:hover': { bgcolor: 'rgba(245,200,0,0.04)' },
      }}
    >
      <Box sx={{ width: '220px', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: '18px' }}>{isoToFlag(t.iso)}</Typography>
        <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: '#111111' }}>{t.territory}</Typography>
      </Box>
      <Box sx={{ flex: 1, minWidth: '160px' }}>
        <Tooltip title={t.programme_note || ''} disableHoverListener={!t.programme_note}>
          <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '13px', color: '#555555' }}>{t.programme}</Typography>
        </Tooltip>
      </Box>
      <Box sx={{ width: '120px' }}>
        <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: '#111111' }}>{t.rate_display}</Typography>
      </Box>
      <Box sx={{ width: '160px' }}>
        <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '14px', color: '#1A8C4E' }}>{t.estimated_rebate_display}</Typography>
        {t.vfx_uplift_display && (
          <Typography sx={{ fontFamily: font, fontSize: '10px', color: '#999', fontStyle: 'italic' }}>+{t.vfx_uplift_display} VFX</Typography>
        )}
      </Box>
      <Box sx={{ width: '80px' }}>
        <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '14px', color: t.overall_score >= 60 ? '#1A8C4E' : t.overall_score >= 40 ? '#D4AF37' : '#999' }}>
          {t.overall_score}<Typography component="span" sx={{ fontFamily: font, fontWeight: 400, fontSize: '11px', color: '#BBBBBB' }}>/100</Typography>
        </Typography>
      </Box>
    </Box>
  );

  const renderMobileCard = (t: TerritoryScenario) => {
    const cells = [
      { label: 'Programme', value: t.programme, valueColor: '#111111' },
      { label: 'Incentive Rate', value: t.rate_display, valueColor: '#111111' },
      { label: 'Est. Incentive', value: t.vfx_uplift_display ? `${t.estimated_rebate_display} (+${t.vfx_uplift_display} VFX)` : t.estimated_rebate_display, valueColor: '#1A8C4E' },
    ];
    return (
      <Box key={t.territory} sx={{ border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', p: 2, mb: 1.5, bgcolor: '#FFFFFF' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography sx={{ fontSize: '20px' }}>{isoToFlag(t.iso)}</Typography>
          <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '15px', color: '#111111', flex: 1 }}>{t.territory}</Typography>
          <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '15px', color: t.overall_score >= 60 ? '#1A8C4E' : t.overall_score >= 40 ? '#D4AF37' : '#999' }}>
            {t.overall_score}<Typography component="span" sx={{ fontFamily: font, fontWeight: 400, fontSize: '11px', color: '#BBBBBB' }}>/100</Typography>
          </Typography>
        </Box>
        {cells.map((cell) => (
          <Box key={cell.label} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, py: 0.5, borderTop: '1px solid rgba(0,0,0,0.04)' }}>
            <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: '12px', color: '#999999' }}>{cell.label}</Typography>
            <Typography sx={{ fontFamily: font, fontWeight: 600, fontSize: '13px', color: cell.valueColor, textAlign: 'right' }}>{cell.value}</Typography>
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
        background: 'linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 35%, #FFFFFF 100%)',
      }}
    >
      <LockOutlined sx={{ color: '#D4AF37', fontSize: '28px' }} />
      <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '15px', color: '#111111' }}>
        {lockedTerritories.length} more territories
      </Typography>
      <Typography sx={{ fontFamily: font, fontSize: '13px', color: '#555555', maxWidth: 360 }}>
        Sign up free to compare all {territories.length} territories, unlock every currency, and switch scoring modes.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5 }}>
        <Button variant="outlined" onClick={() => navigate('/login')} sx={{ borderColor: '#D4AF37', color: '#B8941F', fontFamily: font, fontWeight: 700, fontSize: '13px', height: '38px', px: 2.5, borderRadius: '8px', textTransform: 'none', '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.08)' } }}>Log In</Button>
        <Button variant="contained" onClick={() => navigate('/signup')} sx={{ bgcolor: '#D4AF37', color: '#000', fontFamily: font, fontWeight: 700, fontSize: '13px', height: '38px', px: 2.5, borderRadius: '8px', textTransform: 'none', '&:hover': { bgcolor: '#B8941F' } }}>Sign Up Free →</Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#F8F6F0', minHeight: '100dvh', fontFamily: font }}>
      {/* Navigation Bar */}
      <Box sx={{ bgcolor: '#FFFFFF', borderBottom: '1px solid rgba(0,0,0,0.08)', py: 2 }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Button
                startIcon={<ArrowBack sx={{ fontSize: '16px' }} />}
                onClick={() => navigate('/')}
                sx={{
                  color: '#555555', fontFamily: font, fontWeight: 600, fontSize: '13px',
                  textTransform: 'none', px: 1.5, height: '36px', borderRadius: '8px',
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', color: '#111111' },
                }}
              >
                Back to Home
              </Button>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={() => navigate('/login')}
                sx={{
                  borderColor: '#D4AF37', color: '#D4AF37',
                  fontFamily: font, fontWeight: 700, fontSize: '13px',
                  height: '36px', px: 2.5, borderRadius: '8px', textTransform: 'none',
                  '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212,175,55,0.08)' },
                }}
              >
                Log In
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/signup')}
                sx={{
                  bgcolor: '#D4AF37', color: '#000000',
                  fontFamily: font, fontWeight: 700, fontSize: '13px',
                  height: '36px', px: 2.5, borderRadius: '8px', textTransform: 'none',
                  '&:hover': { bgcolor: '#B8941F' },
                }}
              >
                Sign Up Free
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 5 } }}>
        {/* Page Header */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: { xs: '20px', sm: '28px' }, color: '#111111', mb: 1 }}>
            What If Calculator
          </Typography>
          <Typography sx={{ fontFamily: font, fontWeight: 400, fontSize: { xs: '13px', sm: '15px' }, color: '#555555' }}>
            Compare incentive returns across {territories.length || '...'} territories at your budget
          </Typography>
        </Box>

        {/* Controls Card */}
        <Box
          sx={{
            bgcolor: '#FFFFFF', borderRadius: '12px',
            border: '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            p: { xs: 2, sm: 4 }, mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', gap: { xs: 2, sm: 4 }, flexWrap: 'wrap' }}>
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

        {/* Production Priority & Baseline Toggle */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
          {/* Baseline toggle */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontFamily: font, fontWeight: 700, fontSize: '11px', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Baseline
            </Typography>
            <SegmentedToggle
              radius={9999}
              value={baseline}
              onChange={(v) => setBaseline(v as 'US' | 'GB')}
              fontFamily={font}
              palette={PUBLIC_TOGGLE_PAL}
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
              <IconButton sx={{ color: '#F5C800', width: '32px', height: '32px', '&:hover': { bgcolor: 'rgba(245,200,0,0.1)' } }}>
                <InfoOutlined sx={{ fontSize: '18px' }} />
              </IconButton>
            </Tooltip>
            <SegmentedToggle
              radius={9999}
              value={priority}
              onChange={() => { /* only 'incentive' is selectable for guests */ }}
              fontFamily={font}
              palette={PUBLIC_TOGGLE_PAL}
              options={[
                { value: 'incentive', label: 'Maximise Incentive' },
                { value: 'full', label: 'Full Picture', locked: true, lockedHint: 'Sign up free to unlock Full Picture & Location First' },
                { value: 'location', label: 'Location First', locked: true, lockedHint: 'Sign up free to unlock Full Picture & Location First' },
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
              bgcolor: '#FFFFFF', borderRadius: '12px',
              border: '1px solid rgba(0,0,0,0.06)',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              overflow: 'hidden', mb: 4,
              position: 'relative',
            }}
          >
            {/* Loading overlay */}
            {loading && scenario && (
              <Box
                sx={{
                  position: 'absolute', inset: 0,
                  bgcolor: 'rgba(255, 255, 255, 0.7)',
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
                  display: 'flex', bgcolor: 'rgba(245,200,0,0.1)',
                  height: '44px', alignItems: 'center', px: 2,
                  borderBottom: '1px solid rgba(0,0,0,0.04)',
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
                      <InfoOutlined sx={{ fontSize: '12px', color: '#D4AF37', opacity: 0.7 }} />
                    </Box>
                  </Tooltip>
                </Box>
              </Box>

              {/* Body rows — first 5 open, a short blurred strip behind the CTA */}
              <Box>
                {visibleTerritories.map((t, index) => renderDesktopRow(t, index))}
                {lockedTerritories.length > 0 && (
                  <Box sx={{ position: 'relative', maxHeight: 210, overflow: 'hidden' }}>
                    <Box sx={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }} aria-hidden>
                      {lockedTerritories.slice(0, 4).map((t, index) => renderDesktopRow(t, FREE_VISIBLE + index))}
                    </Box>
                    {lockedCTA}
                  </Box>
                )}
              </Box>
            </Box>

            {/* Mobile card view — first 5 open, a short blurred strip behind the CTA */}
            <Box sx={{ display: { xs: 'block', md: 'none' }, p: 1.5 }}>
              {visibleTerritories.map((t) => renderMobileCard(t))}
              {lockedTerritories.length > 0 && (
                <Box sx={{ position: 'relative', maxHeight: 260, overflow: 'hidden' }}>
                  <Box sx={{ filter: 'blur(5px)', pointerEvents: 'none', userSelect: 'none' }} aria-hidden>
                    {lockedTerritories.slice(0, 2).map((t) => renderMobileCard(t))}
                  </Box>
                  {lockedCTA}
                </Box>
              )}
            </Box>
          </Box>
        )}

      </Container>
    </Box>
  );
}
