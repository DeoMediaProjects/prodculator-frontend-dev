import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';

/**
 * Everything below the hero.
 *
 * Structured as an argument a cold visitor actually needs, in order: this is not
 * coverage → here is what you get → here is what sits behind the numbers → here is
 * the price. Not as interchangeable blocks with an eyebrow label on each.
 *
 * Three things the supplied mockup did that are deliberately absent: a tracked
 * uppercase kicker above every section, an `01 / 02 / 03` numbered step row, and a
 * grid of same-shaped icon cards. Each is scaffolding reached for by reflex rather
 * than because the content is a sequence or a set of peers.
 */

/** Section shell. No eyebrow slot, on purpose — there is nowhere to put one. */
function Section({
  children,
  alt = false,
}: {
  children: React.ReactNode;
  alt?: boolean;
}) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Box
      component="section"
      sx={{
        py: { xs: 8, md: 12 },
        borderTop: `1px solid ${t.border}`,
        bgcolor: alt ? t.cardBg : 'transparent',
      }}
    >
      <Container maxWidth="lg">{children}</Container>
    </Box>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Typography
      component="h2"
      sx={{
        color: t.textPrimary,
        fontWeight: 700,
        fontSize: { xs: '1.75rem', md: '2.5rem' },
        lineHeight: 1.15,
        letterSpacing: '-0.025em',
        textWrap: 'balance',
        maxWidth: '22ch',
      }}
    >
      {children}
    </Typography>
  );
}

function Prose({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Typography
      sx={{
        color: t.textSecondary,
        fontSize: { xs: '1rem', md: '1.0625rem' },
        // Light type on dark reads lighter than it is, so it gets more leading.
        lineHeight: 1.75,
        maxWidth: wide ? '70ch' : '62ch',
        textWrap: 'pretty',
      }}
    >
      {children}
    </Typography>
  );
}

// ── The category question a cold visitor arrives with ────────────────────────
// Two columns, but not two matching cards: one is the thing they already know and
// is set back in muted ink; the other is this product and carries the emphasis.
// Peers would be wrong here — the whole point is that they are different questions.

const COVERAGE = [
  'Does the story work?',
  'Are the characters landing?',
  'Is the structure sound?',
];

const PRODCULATOR = [
  'Where does this shoot for the least money?',
  'What is that territory’s incentive actually worth to this project?',
  'What is the net cost once the incentive is honest about itself?',
];

function CategorySection() {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Section>
      <SectionHeading>You already know if the script is good.</SectionHeading>
      <Box sx={{ mt: 2.5, mb: { xs: 5, md: 6 } }}>
        <Prose>
          Coverage answers whether it works on the page. Nobody answers the question
          that follows it, which is how you would actually produce the thing, and
          where. That question has a right answer and it is worth six figures.
        </Prose>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1.35fr' },
          gap: { xs: 4, md: 7 },
          alignItems: 'start',
        }}
      >
        <Box>
          <Typography sx={{ color: t.textFaint, fontSize: 14, fontWeight: 700, mb: 2 }}>
            Script coverage asks
          </Typography>
          {COVERAGE.map((q) => (
            <Typography
              key={q}
              sx={{ color: t.textFaint, fontSize: 15, lineHeight: 2, textWrap: 'pretty' }}
            >
              {q}
            </Typography>
          ))}
        </Box>

        <Box sx={{ borderLeft: { md: `1px solid ${t.border}` }, pl: { md: 5 } }}>
          <Typography sx={{ color: t.goldText, fontSize: 14, fontWeight: 700, mb: 2 }}>
            Prodculator asks
          </Typography>
          {PRODCULATOR.map((q) => (
            <Typography
              key={q}
              sx={{
                color: t.textPrimary,
                fontSize: { xs: 17, md: 19 },
                fontWeight: 600,
                lineHeight: 1.6,
                mb: 1.5,
                textWrap: 'pretty',
              }}
            >
              {q}
            </Typography>
          ))}
        </Box>
      </Box>
    </Section>
  );
}

// ── What the report contains ─────────────────────────────────────────────────
// A definition list, not a card grid. These are genuinely unequal in weight and
// length, and forcing them into equal boxes would be the reflex the brief rejects.

const CONTENTS: { title: string; body: string }[] = [
  {
    title: 'Territory ranking',
    body: 'Every territory you are considering, scored across cost base, crew depth, infrastructure, currency position and incentive value. A territory whose incentive we cannot confirm for your format is marked unscored on that dimension rather than quietly rewarded for it.',
  },
  {
    title: 'Incentive analysis, per programme',
    body: 'Not per territory. Two programmes in the same country routinely disagree about what they accept, and the difference decides your budget. Each one states its rate, its thresholds and whether your production actually clears them.',
  },
  {
    title: 'Net production cost',
    body: 'Budget less the incentives you can rely on. Illustrative figures are shown separately and never subtracted, so the number you take into a financing meeting is one you can defend when someone checks it.',
  },
  {
    title: 'Schedule, grants and festivals',
    body: 'Certification-to-cash windows, matched funds with their deadlines, and festivals that accept your format and timing. Deadline guidance recorded for a different format is withheld rather than repurposed.',
  },
];

function ContentsSection() {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Section alt>
      <SectionHeading>What comes back</SectionHeading>
      <Box
        component="dl"
        sx={{
          mt: { xs: 4, md: 5 },
          mb: 0,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
          columnGap: 7,
          rowGap: { xs: 4, md: 5 },
        }}
      >
        {CONTENTS.map((item) => (
          <Box key={item.title}>
            <Typography
              component="dt"
              sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 17, mb: 1 }}
            >
              {item.title}
            </Typography>
            <Typography
              component="dd"
              sx={{
                m: 0,
                color: t.textSecondary,
                fontSize: 15,
                lineHeight: 1.75,
                textWrap: 'pretty',
              }}
            >
              {item.body}
            </Typography>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

// ── What sits behind the numbers ─────────────────────────────────────────────
// Figures set inline in a sentence rather than as a three-up stat row. The stat row
// is the SaaS cliché the brief rejects, and these numbers are more persuasive as
// evidence inside an argument than as decoration above one.

/** A verified figure set inline in prose. Gold, because gold means checked. */
function Figure({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Box
      component="span"
      sx={{ color: t.goldText, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
    >
      {children}
    </Box>
  );
}

function EvidenceSection() {
  return (
    <Section>
      <SectionHeading>Where the numbers come from</SectionHeading>
      <Box sx={{ mt: 2.5, display: 'grid', gap: 2.5 }}>
        <Prose wide>
          <Figure>49</Figure> incentive programmes across <Figure>28</Figure>{' '}
          territories, and <Figure>177</Figure> festivals, each held as a record with
          its own source and its own verification date. Rates, caps, minimum spends
          and payment windows are read from those records rather than estimated.
        </Prose>
        <Prose wide>
          Where a record cannot answer a question about your project, the report says
          so and names the requirement that is unresolved. That is the part we are
          most careful about: a figure you cannot check is worth less than no figure
          at all, because you will only discover it was wrong after you have
          committed money to it.
        </Prose>
      </Box>
    </Section>
  );
}

// ── Close ────────────────────────────────────────────────────────────────────

function ClosingSection() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Section alt>
      <Box sx={{ maxWidth: '52ch' }}>
        <SectionHeading>Start with the script you already have.</SectionHeading>
        <Box sx={{ mt: 2.5 }}>
          <Prose>
            Upload it, name the territories you are weighing up, and read the report
            before you commit to a location. You can look at a finished one first.
          </Prose>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 4 }}>
          <Button variant="contained" size="large" onClick={() => navigate('/upload')} sx={{ px: 4, py: 1.5 }}>
            Upload a script
          </Button>
          <Button variant="outlined" size="large" onClick={() => navigate('/sample')} sx={{ px: 4, py: 1.5 }}>
            Read a sample report
          </Button>
        </Box>
        <Typography sx={{ color: t.textFaint, fontSize: 13.5, mt: 3, lineHeight: 1.7 }}>
          You confirm you have the right to upload the screenplay, and accept the
          terms, before anything is analysed. Scripts are not retained after the
          report is produced.
        </Typography>
      </Box>
    </Section>
  );
}

export function LandingSections() {
  return (
    <>
      <CategorySection />
      <ContentsSection />
      <EvidenceSection />
      <ClosingSection />
    </>
  );
}
