import { Box, Typography } from '@mui/material';
import { CheckRounded } from '@mui/icons-material';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

/**
 * What a producer gets back, shown as a recommendation rather than a table.
 *
 * The hierarchy is the argument: one territory is the answer, the others are the
 * working. An even three-row list makes the reader do the ranking themselves, which
 * is the job they came here to hand over.
 *
 * The two runners-up are not filler. They show the product's grammar — a figure it
 * will not confirm, and a programme the budget does not reach — which is the part
 * that makes the recommended number trustworthy. A preview showing only the good
 * news would be the same optimistic pitch every competitor makes.
 *
 * Figures are illustrative of the output format, not a claim about any real project.
 */

interface Alternative {
  territory: string;
  rate: string;
  amount: string | null;
  note: string;
}

const ALTERNATIVES: Alternative[] = [
  {
    territory: 'New York',
    rate: '30%',
    amount: '£173,000',
    note: 'Short-film eligibility unverified',
  },
  {
    territory: 'Louisiana',
    rate: '25%',
    amount: null,
    note: 'Minimum spend not met',
  },
];

export function IncentivePreview() {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Box
      component="figure"
      aria-label="Example of a Prodculator incentive analysis, recommending Ireland"
      sx={{
        m: 0,
        border: `1px solid ${t.border}`,
        bgcolor: t.cardBg,
        borderRadius: 3,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          px: { xs: 3, sm: 3.5 },
          py: 2,
          borderBottom: `1px solid ${t.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: 2,
        }}
      >
        <Typography
          sx={{
            color: t.textFaint,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
          }}
        >
          Incentive analysis
        </Typography>
        <Typography sx={{ color: t.textFaint, fontSize: 12.5 }}>
          Feature · £2.4M
        </Typography>
      </Box>

      {/* ── The recommendation ─────────────────────────────────────────────── */}
      <Box
        sx={{
          px: { xs: 3, sm: 3.5 },
          pt: 3,
          pb: 3.5,
          borderBottom: `1px solid ${t.border}`,
        }}
      >
        <Box
          component="span"
          sx={{
            display: 'inline-block',
            bgcolor: t.gold,
            color: mode === 'dark' ? '#000' : '#fff',
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            px: 1.25,
            py: 0.4,
            borderRadius: 1,
            mb: 1.75,
          }}
        >
          Best fit
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Typography
            sx={{
              color: t.textPrimary,
              fontWeight: 700,
              fontSize: { xs: 26, sm: 30 },
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
            }}
          >
            Ireland
          </Typography>
          <Typography
            sx={{
              color: t.textSecondary,
              fontSize: 15,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            32% incentive
          </Typography>
        </Box>

        {/* The one figure on the page that survived every check. */}
        <Typography
          sx={{
            color: t.goldText,
            fontWeight: 800,
            fontSize: { xs: 32, sm: 38 },
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1.15,
            mt: 1.5,
          }}
        >
          £184,000
        </Typography>
        <Typography sx={{ color: t.textSecondary, fontSize: 13.5, mt: 0.25 }}>
          Estimated incentive
        </Typography>

        <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mt: 2 }}>
          {['Format eligible', 'Programme verified'].map((label) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CheckRounded sx={{ fontSize: 15, color: t.success }} />
              <Typography sx={{ color: t.textSecondary, fontSize: 12.5, fontWeight: 600 }}>
                {label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── The working ────────────────────────────────────────────────────── */}
      {ALTERNATIVES.map((alt, i) => (
        <Box
          key={alt.territory}
          sx={{
            px: { xs: 3, sm: 3.5 },
            py: 2,
            borderTop: i === 0 ? 'none' : `1px solid ${t.borderSoft}`,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            columnGap: 2,
            alignItems: 'baseline',
          }}
        >
          <Typography sx={{ color: t.textSecondary, fontSize: 14.5, fontWeight: 600 }}>
            {alt.territory}
          </Typography>
          <Typography
            sx={{
              color: alt.amount ? t.textSecondary : t.textFaint,
              fontSize: 14,
              fontWeight: 600,
              textAlign: 'right',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {alt.amount ?? '—'}
          </Typography>
          <Typography sx={{ color: t.textFaint, fontSize: 12, gridColumn: '1 / -1', mt: 0.25 }}>
            {alt.rate} · {alt.note}
          </Typography>
        </Box>
      ))}

      <Box
        component="figcaption"
        sx={{
          px: { xs: 3, sm: 3.5 },
          py: 1.75,
          borderTop: `1px solid ${t.border}`,
          bgcolor: t.cardBgAlt,
        }}
      >
        <Typography sx={{ color: t.textFaint, fontSize: 12, lineHeight: 1.6 }}>
          Illustrative of report output. Only a verified incentive is counted toward
          your net production cost.
        </Typography>
      </Box>
    </Box>
  );
}
