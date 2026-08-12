import { Box, Container, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { useGeoCurrency } from '@/app/hooks/useGeoCurrency';
import { usePromotion, discountedPrice, formatPrice } from '@/app/hooks/usePromotion';
import { PLAN_PRICING } from '@/services/stripe.service';
import { DiscountSticker } from '@/app/components/common/DiscountSticker';
import { IncentivePreview } from '@/app/components/user/landing/IncentivePreview';

/**
 * Everything below the hero, following the supplied paid-traffic layout:
 * production framing → how it works → coverage vs production → the agreement gate
 * → the launch offer → plans → close.
 *
 * Two departures from the supplied HTML, both deliberate:
 *
 * 1. The mockup's body copy in the framing and agreement sections was written to
 *    the client about the page ("PRODCULATOR does not need a separate marketing
 *    site for the MVP", "this should remain part of the product flow"). That is
 *    notes to the builder, not copy for a visitor, so those blocks carry
 *    customer-facing prose in the same slots. Same for the mockup's "send Meta
 *    traffic with UTMs" aside, which is campaign advice and is not on the page.
 *
 * 2. Every price is derived from PLAN_PRICING and the live promotion endpoint
 *    rather than typed in. The mockup hardcodes $36.60 / $89.40 / $179.40, a 40%
 *    cut of the list prices — and the live coupon is 45%, so those figures were
 *    already wrong in the file they were written into. That is the failure mode:
 *    a price typed onto a page keeps being quoted after the coupon behind it has
 *    moved, and the customer is charged something else.
 */

// ── Shared shells ────────────────────────────────────────────────────────────

function Section({
  children,
  alt = false,
  id,
}: {
  children: React.ReactNode;
  alt?: boolean;
  id?: string;
}) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Box
      component="section"
      id={id}
      sx={{
        py: { xs: 7, md: 11 },
        borderTop: `1px solid ${t.border}`,
        bgcolor: alt ? t.cardBg : 'transparent',
      }}
    >
      <Container maxWidth="lg">{children}</Container>
    </Box>
  );
}

function Kicker({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Typography
      sx={{
        color: t.goldText,
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography>
  );
}

function SectionH2({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Typography
      component="h2"
      sx={{
        color: t.textPrimary,
        fontWeight: 700,
        fontSize: { xs: '2rem', md: '3rem' },
        lineHeight: 1.06,
        letterSpacing: '-0.035em',
        textWrap: 'balance',
        mt: 1.25,
        mb: 1.75,
      }}
    >
      {children}
    </Typography>
  );
}

function Gold({ children }: { children: React.ReactNode }) {
  const { mode } = useThemeMode();
  const t = tokens(mode);
  return (
    <Box component="span" sx={{ color: t.goldText }}>
      {children}
    </Box>
  );
}

// ── 1. Production framing, with a report preview ─────────────────────────────

function ProductionSection() {
  return (
    <Section>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '0.9fr 1.1fr' },
          gap: { xs: 5, md: 6 },
          alignItems: 'center',
        }}
      >
        {/* Heading only. The body paragraph and the source-and-verification aside
            that used to sit under it were removed at the client's direction; the
            preview beside it now carries the section on its own. */}
        <Box>
          <Kicker>The question after coverage</Kicker>
          <SectionH2>
            You&apos;ve analysed the screenplay. <Gold>Now analyse the production.</Gold>
          </SectionH2>
        </Box>

        {/* The incentive analysis, not the territory bar chart that briefly stood
            here. It shows the product's grammar rather than a ranking: a figure it
            will not confirm, and a programme the budget does not reach, beside the
            one number that survived every check. */}
        <IncentivePreview />
      </Box>
    </Section>
  );
}

// ── 2. How it works ──────────────────────────────────────────────────────────

const STEPS: { num: string; title: string; body: string }[] = [
  {
    num: '01 · UPLOAD',
    title: 'Start with the screenplay',
    body: 'Upload the script so its production requirements, including format, scale and schedule shape, can be read rather than guessed at.',
  },
  {
    num: '02 · COMPARE',
    title: 'Compare territories & incentives',
    body: 'See which programmes your production actually clears, what each one is worth to it, and how the territories rank against each other.',
  },
  {
    num: '03 · REPORT',
    title: 'Generate production intelligence',
    body: 'Take away a report you can defend in a financing conversation, with the working shown and the unverified figures marked as such.',
  },
];

function HowItWorksSection() {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Section alt>
      <Box sx={{ maxWidth: 760, mb: { xs: 4, md: 5 } }}>
        <Kicker>How it works</Kicker>
        <SectionH2>From screenplay to production decision.</SectionH2>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
        {STEPS.map((step) => (
          <Box
            key={step.num}
            sx={{
              bgcolor: mode === 'dark' ? '#101010' : t.cardBgAlt,
              border: `1px solid ${t.border}`,
              borderRadius: 4,
              p: 3.25,
            }}
          >
            <Typography sx={{ color: t.goldText, fontWeight: 900, fontSize: 12, letterSpacing: '0.1em' }}>
              {step.num}
            </Typography>
            <Typography sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 20, mt: 1.25, mb: 1 }}>
              {step.title}
            </Typography>
            <Typography sx={{ color: t.textSecondary, fontSize: 15, lineHeight: 1.7, textWrap: 'pretty' }}>
              {step.body}
            </Typography>
          </Box>
        ))}
      </Box>
    </Section>
  );
}

// ── 3. Coverage vs production ────────────────────────────────────────────────

const COVERAGE = ['Story and character', 'Structure', 'Creative feedback', 'Development perspective'];
const PRODUCTION = ['Production territories', 'Tax incentive analysis', 'What-if scenarios', 'Production decision intelligence'];

function CompareSection() {
  const { mode } = useThemeMode();
  const t = tokens(mode);

  const column = (
    kicker: string,
    heading: string,
    items: string[],
    emphasised: boolean,
  ) => (
    <Box
      sx={{
        p: { xs: 3.5, md: 4.5 },
        bgcolor: emphasised
          ? (mode === 'dark' ? '#17130A' : t.goldDim)
          : (mode === 'dark' ? '#101010' : t.cardBgAlt),
        borderLeft: emphasised ? { md: `1px solid ${t.gold}` } : undefined,
        borderTop: emphasised ? { xs: `1px solid ${t.gold}`, md: 'none' } : undefined,
      }}
    >
      <Kicker>{kicker}</Kicker>
      <Typography
        sx={{
          color: emphasised ? t.textPrimary : t.textSecondary,
          fontWeight: 700,
          fontSize: { xs: 22, md: 26 },
          letterSpacing: '-0.02em',
          mt: 1,
          mb: 1.5,
        }}
      >
        {heading}
      </Typography>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {items.map((item) => (
          <Typography
            key={item}
            component="li"
            sx={{
              color: emphasised ? t.textPrimary : t.textFaint,
              fontSize: emphasised ? 16 : 15,
              fontWeight: emphasised ? 600 : 400,
              my: 1.25,
              lineHeight: 1.6,
            }}
          >
            {item}
          </Typography>
        ))}
      </Box>
    </Box>
  );

  return (
    <Section>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          border: `1px solid ${t.border}`,
          borderRadius: 5,
          overflow: 'hidden',
        }}
      >
        {column('Screenplay coverage', 'Is the screenplay working?', COVERAGE, false)}
        {column('Prodculator', 'How could we produce it?', PRODUCTION, true)}
      </Box>
    </Section>
  );
}

// ── 4. The agreement gate ────────────────────────────────────────────────────

const AGREEMENT_POINTS = [
  'Confirm you have authority to upload the screenplay',
  'Accept the Terms of Service and Privacy Policy',
  'Acknowledge how the screenplay is processed',
  'Your name, signature, timestamp and terms version are recorded',
];

function AgreementSection() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Section alt id="agreement">
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: { xs: 4, md: 6 },
          alignItems: 'center',
          border: `1px solid ${t.border}`,
          borderRadius: 5,
          p: { xs: 3.5, md: 4.5 },
          bgcolor: mode === 'dark' ? '#0F0F0F' : t.cardBgAlt,
        }}
      >
        <Box>
          <Kicker>Before upload</Kicker>
          <SectionH2>Sign and agree before analysis begins.</SectionH2>
          <Typography sx={{ color: t.textSecondary, fontSize: { xs: '1rem', md: '1.0625rem' }, lineHeight: 1.7, textWrap: 'pretty' }}>
            Your screenplay is your property and we treat it that way. Nothing is
            analysed until you have confirmed you hold the rights to it and accepted
            the processing terms. Scripts are not retained once the report is produced.
          </Typography>
        </Box>

        <Box sx={{ border: `1px solid ${t.border}`, borderRadius: 4, p: { xs: 2.5, md: 3 } }}>
          {AGREEMENT_POINTS.map((point) => (
            <Box key={point} sx={{ display: 'flex', gap: 1.25, my: 1.5 }}>
              <Box component="span" sx={{ color: t.success, fontWeight: 900 }} aria-hidden>
                ✓
              </Box>
              <Typography sx={{ color: t.textSecondary, fontSize: 14.5, lineHeight: 1.6 }}>
                {point}
              </Typography>
            </Box>
          ))}
          <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate('/signup')}>
            Continue to Agreement
          </Button>
        </Box>
      </Box>
    </Section>
  );
}

// ── 5. The launch offer ──────────────────────────────────────────────────────

/**
 * Renders only while a coupon exists that covers Professional. Both the percentage
 * and the wording of the term come from the promotion endpoint, so when the coupon
 * ends the band disappears with it instead of advertising a price nobody is charged.
 */
function OfferSection() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { isUK } = useGeoCurrency();
  const promotion = usePromotion();

  const symbol = isUK ? '£' : '$';
  const list = isUK ? PLAN_PRICING.professional.monthlyGBP : PLAN_PRICING.professional.monthlyUSD;
  const cut = discountedPrice(list, promotion, 'professional');

  if (cut == null) return null;

  return (
    <Section>
      <Box
        sx={{
          border: `1px solid ${t.gold}`,
          borderRadius: 6,
          p: { xs: 3.5, md: 5 },
          background:
            mode === 'dark'
              ? 'linear-gradient(135deg, #171208, #0D0D0D)'
              : `linear-gradient(135deg, ${t.goldDim}, transparent)`,
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          gap: { xs: 3.5, md: 4 },
          alignItems: 'center',
        }}
      >
        <Box>
          <Box
            component="span"
            sx={{
              display: 'inline-flex',
              bgcolor: t.gold,
              color: mode === 'dark' ? '#0A0A0A' : '#fff',
              borderRadius: 999,
              px: 1.5,
              py: 0.75,
              fontSize: 12,
              fontWeight: 900,
              letterSpacing: '0.06em',
            }}
          >
            MVP LAUNCH · FOUNDING PRODUCER
          </Box>
          {/* Plan-agnostic on purpose: the coupon covers Professional, Producer and
              Studio, and naming one of them in the headline would understate it.
              Which plans are covered is the label's job, and the label comes from
              the same response the checkout honours. */}
          <SectionH2>{promotion.percentOff}% off at launch.</SectionH2>
          {/* The label is the only prose left in this band, and it is the server's
              own wording for the coupon rather than anything written here — so the
              terms on the page and the terms Stripe applies are the same string. */}
          <Typography sx={{ color: t.textPrimary, fontSize: { xs: '1rem', md: '1.0625rem' }, fontWeight: 600, lineHeight: 1.7, maxWidth: 690 }}>
            {promotion.label}
          </Typography>
          <Button variant="contained" size="large" sx={{ mt: 3, px: 3.5 }} onClick={() => navigate('/pricing')}>
            View Launch Pricing
          </Button>
        </Box>

        <Box sx={{ textAlign: { xs: 'left', md: 'right' } }}>
          <Typography sx={{ color: t.textFaint, fontSize: 18, textDecoration: 'line-through' }}>
            {symbol}{list} / month
          </Typography>
          <Typography
            sx={{
              color: t.goldText,
              fontWeight: 900,
              fontSize: { xs: 44, md: 52 },
              lineHeight: 1.1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {symbol}{formatPrice(cut)}
            <Box component="span" sx={{ color: t.textSecondary, fontSize: 16, fontWeight: 600, ml: 0.75 }}>
              / month
            </Box>
          </Typography>
          <Typography sx={{ color: t.textFaint, fontSize: 14, mt: 0.5 }}>
            Professional · applied at checkout
          </Typography>
        </Box>
      </Box>
    </Section>
  );
}

// ── 6. Plans ─────────────────────────────────────────────────────────────────

interface StripPlan {
  label: string;
  name: string;
  /** Absent on Explorer, which has no price to quote. */
  usd?: number;
  gbp?: number;
  per?: string;
  /** Plan key, so the discount is shown on exactly the plans the coupon covers. */
  planType?: string;
  features: string[];
  featured?: boolean;
  audience: 'individual' | 'business';
}

const STRIP_PLANS: StripPlan[] = [
  {
    label: 'Try the platform',
    name: 'Explorer',
    features: ['1 trial report', '1 territory comparison'],
    audience: 'individual',
  },
  {
    label: 'One-off',
    name: 'Single Report',
    usd: PLAN_PRICING.singleReport.monthlyUSD,
    gbp: PLAN_PRICING.singleReport.monthlyGBP,
    per: 'one-off',
    // Not a subscription plan, but inside the launch offer. See the note on
    // SINGLE_REPORT_PROMO_KEY in the payments service.
    planType: 'single',
    features: ['Full 13 section report', 'All available territories'],
    audience: 'individual',
  },
  {
    label: 'Best value',
    name: 'Professional',
    usd: PLAN_PRICING.professional.monthlyUSD,
    gbp: PLAN_PRICING.professional.monthlyGBP,
    planType: 'professional',
    features: ['1 script per month', 'Up to 3 territories', 'Full 13 section report', 'What If Calculator'],
    featured: true,
    audience: 'individual',
  },
  {
    label: 'Best for producers',
    name: 'Producer',
    usd: PLAN_PRICING.producer.monthlyUSD,
    gbp: PLAN_PRICING.producer.monthlyGBP,
    planType: 'producer',
    features: ['3 scripts per month', 'Up to 5 territories per script'],
    audience: 'individual',
  },
  {
    label: 'Production companies',
    name: 'Studio',
    usd: PLAN_PRICING.studio.monthlyUSD,
    gbp: PLAN_PRICING.studio.monthlyGBP,
    planType: 'studio',
    features: ['10 scripts per month', 'Up to 3 team seats'],
    featured: false,
    audience: 'business',
  },
];

function PricingStripSection() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const { isUK } = useGeoCurrency();
  const promotion = usePromotion();

  const symbol = isUK ? '£' : '$';

  return (
    <Section alt id="pricing">
      <Box sx={{ maxWidth: 760, mb: { xs: 4, md: 5 } }}>
        <Kicker>Pricing</Kicker>
        <SectionH2>Pick the plan that fits the slate.</SectionH2>
        <Typography sx={{ color: t.textSecondary, fontSize: '1.0625rem' }}>
          One free report to try it. No card required.
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(5, 1fr)' },
          gap: 2,
          alignItems: 'stretch',
        }}
      >
        {STRIP_PLANS.map((plan) => {
          const list = isUK ? plan.gbp : plan.usd;
          const cut = list != null && plan.planType ? discountedPrice(list, promotion, plan.planType) : null;
          return (
            <Box key={plan.name} sx={{ position: 'relative', display: 'flex' }}>
              {plan.planType && <DiscountSticker planType={plan.planType} compact />}
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: plan.featured ? (mode === 'dark' ? '#171309' : t.goldDim) : (mode === 'dark' ? '#111' : t.cardBgAlt),
                  border: plan.featured ? `2px solid ${t.gold}` : `1px solid ${t.border}`,
                  borderRadius: 4,
                  p: 2.75,
                  transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1), border-color 220ms ease',
                  '&:hover': { borderColor: t.gold, transform: 'translateY(-4px)' },
                  '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:hover': { transform: 'none' } },
                }}
              >
                <Typography sx={{ color: t.goldText, fontSize: 11, fontWeight: 900, letterSpacing: '0.09em', textTransform: 'uppercase', minHeight: 30 }}>
                  {plan.label}
                </Typography>
                <Typography sx={{ color: t.textPrimary, fontWeight: 700, fontSize: 20, my: 1 }}>
                  {plan.name}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
                  <Typography sx={{ color: t.goldText, fontWeight: 900, fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
                    {list == null ? 'Free' : `${symbol}${formatPrice(cut ?? list)}`}
                  </Typography>
                  {cut != null && list != null && (
                    <Typography sx={{ color: t.textFaint, fontSize: 15, textDecoration: 'line-through' }}>
                      {symbol}{list}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ color: t.textFaint, fontSize: 13, minHeight: 34, mt: 0.25 }}>
                  {list == null ? 'Low-friction entry' : `per ${plan.per ?? 'month'}`}
                </Typography>

                <Box component="ul" sx={{ m: 0, pl: 2.25, flex: 1 }}>
                  {plan.features.map((f) => (
                    <Typography key={f} component="li" sx={{ color: t.textSecondary, fontSize: 14, my: 1, lineHeight: 1.55 }}>
                      {f}
                    </Typography>
                  ))}
                </Box>

                <Button
                  variant={plan.featured ? 'contained' : 'outlined'}
                  fullWidth
                  sx={{ mt: 2 }}
                  onClick={() => navigate(`/pricing?audience=${plan.audience}`)}
                >
                  {plan.featured ? 'Choose Professional' : 'View plan'}
                </Button>
              </Box>
            </Box>
          );
        })}
      </Box>

      <Typography sx={{ color: t.textFaint, fontSize: 14.5, mt: 3.5 }}>
        Running a studio, vendor or agency?{' '}
        <Box
          component="button"
          type="button"
          onClick={() => navigate('/b2b')}
          sx={{
            background: 'none', border: 0, p: 0, font: 'inherit', cursor: 'pointer',
            color: t.goldText, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px',
          }}
        >
          See Business Intelligence Solutions &rarr;
        </Box>
      </Typography>
    </Section>
  );
}

// ── 7. Close ─────────────────────────────────────────────────────────────────

function ClosingSection() {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const t = tokens(mode);

  return (
    <Section>
      <Box sx={{ textAlign: 'center', maxWidth: 820, mx: 'auto' }}>
        <SectionH2>Your next production decision can start with the script.</SectionH2>
        <Typography sx={{ color: t.textSecondary, fontSize: '1.0625rem', lineHeight: 1.7, maxWidth: 670, mx: 'auto', mb: 3.5 }}>
          Upload it, name the territories you are weighing up, and read the report
          before you commit to a location. You can look at a finished one first.
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button variant="contained" size="large" sx={{ px: 3.5, py: 1.4 }} onClick={() => navigate('/upload')}>
            Upload Script
          </Button>
          <Button variant="outlined" size="large" sx={{ px: 3.5, py: 1.4 }} onClick={() => navigate('/faq')}>
            Read FAQ
          </Button>
        </Box>
      </Box>
    </Section>
  );
}

export function LandingSections() {
  return (
    <>
      <ProductionSection />
      <HowItWorksSection />
      <CompareSection />
      <AgreementSection />
      <OfferSection />
      <PricingStripSection />
      <ClosingSection />
    </>
  );
}
