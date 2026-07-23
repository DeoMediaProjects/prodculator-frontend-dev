import { useNavigate } from 'react-router';
import { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import { Check } from '@mui/icons-material';
import { useAuth } from '@/app/contexts/AuthContext';
import { useGeoCurrency } from '@/app/hooks/useGeoCurrency';
import { useCurrentSubscription } from '@/app/hooks/useCurrentSubscription';
import { useThemeMode, tokens } from '@/app/theme/AppTheme';
import { SegmentedToggle } from '@/app/components/user/b2c/SegmentedToggle';
import { PageHeader } from '@/app/components/common/PageHeader';
import { SiteFooter } from '@/app/components/common/SiteFooter';
import {
  STRIPE_PRICES,
  createSubscriptionCheckout,
  createCreditCheckout,
  redirectToCheckout
} from '@/services/stripe.service';
import { cancelScheduledChange } from '@/services/subscription.service';
import { useSnackbar } from 'notistack';
import { ChangePlanModal } from './ChangePlanModal';

type BillingCycle = 'monthly' | 'annual';
type PlanType = 'free' | 'professional' | 'producer' | 'studio';
type PlanAction = 'free' | 'single' | 'subscribe' | 'b2b';
type Audience = 'individual' | 'organization';

interface Plan {
  name: string;
  monthlyUSD: number;
  monthlyGBP: number;
  annualUSD?: number;  // per-month price when billed annually (USD)
  annualGBP?: number;  // per-month price when billed annually (GBP)
  pricePer?: string;   // label after the price, defaults to 'month'
  pricePrefix?: string; // e.g. 'from '
  description: string;
  features: string[];
  cta: string;
  ctaSubtext?: string;
  badge?: string;
  highlight?: boolean;
  action: PlanAction;
  planType?: PlanType;  // required when action === 'subscribe'
  audience: Audience | 'both';
}

type Currency = 'usd' | 'gbp';

// Plan hierarchy mirrors backend RequirePlan / classify_change.
const PLAN_LEVEL: Record<string, number> = {
  free: 0,
  professional: 1,
  producer: 2,
  studio: 3,
};

type ChangeDirectionOrSame = 'upgrade' | 'downgrade' | 'same' | null;

function classifyDirection(currentPlan: string, targetPlan: PlanType): ChangeDirectionOrSame {
  if (!currentPlan) return null;
  const current = PLAN_LEVEL[currentPlan] ?? 0;
  const target = PLAN_LEVEL[targetPlan] ?? 0;
  if (current === target) return 'same';
  return target > current ? 'upgrade' : 'downgrade';
}

export function Pricing() {
  const navigate = useNavigate();
  const { hasAdminPermission, user } = useAuth();
  const { isUK } = useGeoCurrency();
  const { mode } = useThemeMode();
  const t = tokens(mode);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingCredit, setLoadingCredit] = useState(false);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [audience, setAudience] = useState<Audience>('individual');
  // Seed from geo-detection; user can override with the toggle
  const [currency, setCurrency] = useState<Currency>(isUK ? 'gbp' : 'usd');
  const { enqueueSnackbar } = useSnackbar();

  const {
    data: subscriptionData,
    refetch: refetchSubscription,
  } = useCurrentSubscription(!!user);
  const currentPlan = subscriptionData?.plan ?? user?.plan ?? 'free';
  const pendingPlan = subscriptionData?.pending_plan ?? null;
  const hasActiveSubscription = !!subscriptionData?.subscription;

  const [modalState, setModalState] = useState<
    | { open: true; targetPlan: PlanType; targetPriceId: string; targetPlanLabel: string }
    | { open: false }
  >({ open: false });

  // Keep in sync if geo-detection resolves after first render
  const isGBP = currency === 'gbp';
  const symbol = isGBP ? '£' : '$';

  const getPriceId = (planType: PlanType): string => {
    if (planType === 'professional') {
      if (billingCycle === 'annual') return isGBP ? STRIPE_PRICES.professionalAnnualGBP.priceId : STRIPE_PRICES.professionalAnnualUSD.priceId;
      return isGBP ? STRIPE_PRICES.professionalMonthlyGBP.priceId : STRIPE_PRICES.professionalMonthlyUSD.priceId;
    }
    if (planType === 'producer') {
      if (billingCycle === 'annual') return isGBP ? STRIPE_PRICES.producerAnnualGBP.priceId : STRIPE_PRICES.producerAnnualUSD.priceId;
      return isGBP ? STRIPE_PRICES.producerMonthlyGBP.priceId : STRIPE_PRICES.producerMonthlyUSD.priceId;
    }
    if (planType === 'studio') {
      if (billingCycle === 'annual') return isGBP ? STRIPE_PRICES.studioAnnualGBP.priceId : STRIPE_PRICES.studioAnnualUSD.priceId;
      return isGBP ? STRIPE_PRICES.studioMonthlyGBP.priceId : STRIPE_PRICES.studioMonthlyUSD.priceId;
    }
    return '';
  };

  const handleCancelScheduledChange = async () => {
    try {
      await cancelScheduledChange();
      enqueueSnackbar('Scheduled plan change cancelled', { variant: 'success' });
      void refetchSubscription();
    } catch {
      enqueueSnackbar('Failed to cancel scheduled change', { variant: 'error' });
    }
  };

  const handlePlanClick = async (planName: string, planType: PlanType) => {
    if (planType === 'free') {
      navigate('/upload');
      return;
    }

    // If clicking the plan that is currently scheduled to take effect, cancel it.
    if (pendingPlan === planType) {
      await handleCancelScheduledChange();
      return;
    }

    // Existing subscribers route to the native change-plan modal — Stripe
    // Checkout for an existing sub would create a second subscription.
    if (hasActiveSubscription && user) {
      const direction = classifyDirection(currentPlan, planType);
      if (direction === 'same') {
        enqueueSnackbar('You are already on this plan', { variant: 'info' });
        return;
      }
      const priceId = getPriceId(planType);
      if (!priceId) {
        enqueueSnackbar('Price not configured for this plan', { variant: 'error' });
        return;
      }
      setModalState({
        open: true,
        targetPlan: planType,
        targetPriceId: priceId,
        targetPlanLabel: planName,
      });
      return;
    }

    const userEmail = user?.email || prompt('Please enter your email address:');
    if (!userEmail) {
      enqueueSnackbar('Email is required to proceed with payment', { variant: 'error' });
      return;
    }

    setLoadingPlan(planName);

    try {
      const priceId = getPriceId(planType);
      const { url, error } = await createSubscriptionCheckout(priceId, userEmail, user?.email || '', planType);

      if (error) {
        enqueueSnackbar(`Payment error: ${error}`, { variant: 'error' });
        return;
      }
      if (url) {
        await redirectToCheckout(url);
      } else {
        enqueueSnackbar('No checkout URL received', { variant: 'error' });
      }
    } catch (error: any) {
      enqueueSnackbar(`Failed to start payment: ${error.message || 'Unknown error'}`, { variant: 'error' });
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCreditCheckout = async () => {
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }
    setLoadingCredit(true);
    try {
      const priceId = isGBP ? STRIPE_PRICES.singleReportGBP.priceId : STRIPE_PRICES.singleReportUSD.priceId;
      const { url, error } = await createCreditCheckout(priceId);
      if (error) {
        enqueueSnackbar(`Payment error: ${error}`, { variant: 'error' });
        return;
      }
      if (url) {
        await redirectToCheckout(url);
      } else {
        enqueueSnackbar('No checkout URL received', { variant: 'error' });
      }
    } catch (err: any) {
      enqueueSnackbar(`Failed to start payment: ${err.message || 'Unknown error'}`, { variant: 'error' });
    } finally {
      setLoadingCredit(false);
    }
  };

  const ctaForPlan = (plan: Plan): { label: string; disabled: boolean } => {
    if (!hasActiveSubscription || !user) {
      return { label: plan.cta, disabled: false };
    }
    if (plan.planType === 'free') {
      return { label: 'Continue using your plan', disabled: true };
    }
    const direction = classifyDirection(currentPlan, plan.planType!);
    if (direction === 'same') {
      return { label: 'Current plan', disabled: true };
    }
    if (pendingPlan && pendingPlan === plan.planType) {
      return { label: 'Cancel scheduled change', disabled: false };
    }
    if (direction === 'upgrade') return { label: `Upgrade to ${plan.name}`, disabled: false };
    if (direction === 'downgrade') return { label: `Switch to ${plan.name}`, disabled: false };
    return { label: plan.cta, disabled: false };
  };

  // Card CTA routing by plan action.
  const handleCardCta = (plan: Plan) => {
    switch (plan.action) {
      case 'free': navigate('/upload'); break;
      case 'single': void handleCreditCheckout(); break;
      case 'b2b': navigate('/b2b'); break;
      case 'subscribe': void handlePlanClick(plan.name, plan.planType!); break;
    }
  };

  const displayPrice = (plan: Plan): string => {
    if (plan.action === 'free') return '0';
    if (isGBP) {
      return String(billingCycle === 'annual' && plan.annualGBP != null ? plan.annualGBP : plan.monthlyGBP);
    }
    return String(billingCycle === 'annual' && plan.annualUSD != null ? plan.annualUSD : plan.monthlyUSD);
  };

  const plans: Plan[] = [
    {
      name: 'Explorer',
      monthlyUSD: 0,
      monthlyGBP: 0,
      description: 'Try the platform',
      features: [
        '1 script (lifetime trial)',
        'Top 3 territory recommendations',
        'Basic incentive summary',
        'Watermarked PDF download',
      ],
      cta: 'Continue for Free',
      ctaSubtext: 'No credit card required',
      action: 'free',
      planType: 'free',
      audience: 'individual',
    },
    {
      name: 'Single Report',
      monthlyUSD: 1,
      monthlyGBP: 0.79,
      pricePer: 'one-off',
      description: 'One full report, no subscription',
      features: [
        'Full 13 section report',
        'All available territories',
        'Clean PDF download',
        'Tax incentive analysis',
        'Report saved to your dashboard',
      ],
      cta: 'Buy a Single Report',
      ctaSubtext: 'One-time · never expires',
      action: 'single',
      audience: 'individual',
    },
    {
      name: 'Professional',
      monthlyUSD: 1,
      monthlyGBP: 0.79,
      annualUSD: 1,
      annualGBP: 0.79,
      description: 'Full production intelligence',
      features: [
        '1 script per month',
        'Up to 3 territories',
        'Full 13 section report',
        'PDF report download (clean)',
        'What If Calculator',
        'Territory Comparison',
      ],
      cta: 'Start Professional',
      ctaSubtext: 'Cancel anytime',
      action: 'subscribe',
      planType: 'professional',
      audience: 'individual',
    },
    {
      name: 'Producer',
      monthlyUSD: 1,
      monthlyGBP: 0.79,
      annualUSD: 1,
      annualGBP: 0.79,
      description: 'Scale your productions',
      badge: 'BEST VALUE',
      highlight: true,
      features: [
        '3 scripts per month',
        'Up to 5 territories per script',
        'Excel Export',
        'Saved What If Scenarios',
      ],
      cta: 'Start Producer',
      ctaSubtext: 'Cancel anytime',
      action: 'subscribe',
      planType: 'producer',
      audience: 'both',
    },
    {
      name: 'Studio',
      monthlyUSD: 1,
      monthlyGBP: 0.79,
      annualUSD: 1,
      annualGBP: 0.79,
      description: 'Your brand. Your reports.',
      badge: 'FOR PRODUCTION COMPANIES',
      features: [
        '10 scripts per month',
        'Up to 7 territories per script',
        'Investor Summary PDF',
        'Your logo on every PDF',
        '"Prepared by [You]" footer',
        'Up to 3 team seats',
      ],
      cta: 'Start Studio Plan',
      ctaSubtext: 'Cancel anytime',
      action: 'subscribe',
      planType: 'studio',
      audience: 'organization',
    },
    {
      name: 'B2B Solutions',
      monthlyUSD: 2,
      monthlyGBP: 1.6,
      pricePrefix: 'from ',
      description: 'Production intelligence for studios, vendors & agencies',
      features: [
        'Aggregated production demand data',
        'Territory & format trend signals',
        'Crew & equipment demand analytics',
        'Exportable market reports',
      ],
      cta: 'Explore B2B',
      ctaSubtext: 'Requires an account',
      action: 'b2b',
      audience: 'organization',
    },
  ];

  const visiblePlans = plans.filter((p) => p.audience === audience || p.audience === 'both');
  const cardMd = Math.max(3, Math.floor(12 / visiblePlans.length));

  return (
    <Box sx={{ bgcolor: t.pageBg, minHeight: '100dvh' }}>
      <PageHeader />

      <Container maxWidth="xl" sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 5, md: 8 } }}>
        {/* Title */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '2.5rem', md: '3.25rem' }, color: t.textPrimary, mb: 1 }}>
            Pricing
          </Typography>
          <Typography variant="h6" sx={{ color: t.textSecondary, fontWeight: 400 }}>
            Choose the plan that fits your workflow
          </Typography>
        </Box>

        {/* Audience filter */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
          <SegmentedToggle
            radius={12}
            value={audience}
            onChange={(v) => setAudience(v as Audience)}
            options={[
              { value: 'individual', label: 'For individuals' },
              { value: 'organization', label: 'For organizations' },
            ]}
          />
        </Box>

        {/* Billing cycle + currency toggles — smooth sliding segmented controls */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 6, flexWrap: 'wrap' }}>
          <SegmentedToggle
            radius={12}
            value={billingCycle}
            onChange={(v) => setBillingCycle(v as BillingCycle)}
            options={[
              { value: 'monthly', label: 'Monthly' },
              {
                value: 'annual',
                label: (
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
                    Annual
                    <Box
                      component="span"
                      sx={{ bgcolor: t.success, color: '#fff', fontSize: '0.6rem', fontWeight: 700, px: 0.75, py: '2px', borderRadius: 1, lineHeight: 1.4 }}
                    >
                      SAVE 20%
                    </Box>
                  </Box>
                ),
              },
            ]}
          />
          <SegmentedToggle
            radius={12}
            value={currency}
            onChange={(v) => setCurrency(v as Currency)}
            options={[
              { value: 'usd', label: '$ USD' },
              { value: 'gbp', label: '£ GBP' },
            ]}
          />
        </Box>

        {/* Plan cards */}
        <Grid container spacing={3} justifyContent="center" sx={{ mb: 4, pt: 1 }}>
          {visiblePlans.map((plan, index) => {
            const busy = plan.action === 'single' ? loadingCredit : loadingPlan === plan.name;
            const cta = plan.action === 'subscribe' ? ctaForPlan(plan) : { label: plan.cta, disabled: false };
            const disabled = plan.action === 'single' ? loadingCredit : (plan.action === 'subscribe' ? (!!loadingPlan || cta.disabled) : false);
            return (
              <Grid size={{ xs: 12, sm: 6, md: cardMd }} key={plan.name}>
                <Box sx={{ position: 'relative', height: '100%' }}>
                  {plan.badge && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -12,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 2,
                        bgcolor: plan.highlight ? t.gold : t.goldDim,
                        color: plan.highlight ? '#000' : t.gold,
                        border: plan.highlight ? 'none' : `1px solid ${t.gold}`,
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        px: 1.75,
                        py: 0.75,
                        borderRadius: '10px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {plan.badge}
                    </Box>
                  )}
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    border: `1px solid ${plan.highlight ? t.gold : t.border}`,
                    bgcolor: plan.highlight ? t.goldDim : t.cardBg,
                    position: 'relative',
                    overflow: 'visible',
                    // Smooth, restrained entrance + hover lift (no glow, no bounce)
                    '@keyframes riseIn': {
                      from: { opacity: 0, transform: 'translateY(14px)' },
                      to: { opacity: 1, transform: 'translateY(0)' },
                    },
                    animation: 'riseIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
                    animationDelay: `${index * 70}ms`,
                    transition: 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease',
                    '&:hover': { borderColor: t.gold, transform: 'translateY(-4px)' },
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none', transition: 'none', '&:hover': { transform: 'none' } },
                  }}
                >
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4 }}>
                    <Typography variant="h6" sx={{ py: 2, fontWeight: 600, color: t.textPrimary }}>
                      {plan.name}
                    </Typography>

                    {/* Price */}
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="h3" component="span" sx={{ fontWeight: 700, color: t.gold }}>
                        {plan.pricePrefix ?? ''}{symbol}{displayPrice(plan)}
                      </Typography>
                      {plan.action !== 'free' && (
                        <Typography variant="body1" component="span" sx={{ color: t.textSecondary }}>
                          {' '}/ {plan.pricePer ?? 'month'}
                        </Typography>
                      )}
                    </Box>

                    {/* Annual billing note (subscription plans only) */}
                    {billingCycle === 'annual' && (plan.annualGBP != null || plan.annualUSD != null) && (
                      <Typography variant="body2" sx={{ color: t.success, mb: 1 }}>
                        {isGBP && plan.annualGBP != null
                          ? `Billed £${plan.annualGBP * 12}/year`
                          : plan.annualUSD != null
                          ? `Billed $${plan.annualUSD * 12}/year`
                          : 'Billed annually'}
                      </Typography>
                    )}

                    <Typography variant="body2" sx={{ mb: 3, color: t.textSecondary }}>
                      {plan.description}
                    </Typography>

                    {/* Feature list */}
                    <List sx={{ flex: 1 }}>
                      {plan.features.map((feature, idx) => (
                        <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <Check sx={{ color: t.success, fontSize: 18 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={feature}
                            primaryTypographyProps={{ variant: 'body2', sx: { color: t.textPrimary } }}
                          />
                        </ListItem>
                      ))}
                    </List>

                    <Button
                      variant={plan.highlight ? 'contained' : 'outlined'}
                      size="large"
                      fullWidth
                      sx={{ mt: 2 }}
                      onClick={() => handleCardCta(plan)}
                      disabled={disabled}
                    >
                      {busy ? <CircularProgress size={24} color="inherit" /> : cta.label}
                    </Button>

                    {plan.ctaSubtext && (
                      <Typography variant="caption" sx={{ color: t.textSecondary, display: 'block', textAlign: 'center', mt: 1 }}>
                        {plan.ctaSubtext}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
                </Box>
              </Grid>
            );
          })}
        </Grid>

        {/* Platform Economics — admin only */}
        {hasAdminPermission('canViewPlatformEconomics') && (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              mt: 4,
              bgcolor: t.cardBg,
              border: `1px solid ${t.border}`,
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: t.textPrimary }}>
              Platform Economics
            </Typography>
            <Grid container spacing={3}>
              {[
                { label: 'Avg. Cost Per Report', value: '~$0.30', sub: 'AI processing + infrastructure', color: t.gold },
                { label: 'Gross Margin', value: '~99%', sub: 'Highly scalable model', color: t.success },
                { label: 'Scalability', value: 'Infinite', sub: 'Marginal cost near zero', color: t.gold },
              ].map(({ label, value, sub, color }) => (
                <Grid size={{ xs: 12, sm: 4 }} key={label}>
                  <Card elevation={0} sx={{ bgcolor: t.cardBgAlt, border: `1px solid ${t.border}` }}>
                    <CardContent>
                      <Typography variant="overline" sx={{ color: t.textSecondary }}>{label}</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color }}>{value}</Typography>
                      <Typography variant="caption" sx={{ color: t.textSecondary }}>{sub}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

      </Container>

      <SiteFooter />

      {modalState.open && (
        <ChangePlanModal
          open={modalState.open}
          onClose={() => setModalState({ open: false })}
          onSuccess={() => {
            setModalState({ open: false });
            void refetchSubscription();
          }}
          currentPlan={currentPlan}
          targetPlan={modalState.targetPlan}
          targetPriceId={modalState.targetPriceId}
          targetPlanLabel={modalState.targetPlanLabel}
        />
      )}
    </Box>
  );
}
