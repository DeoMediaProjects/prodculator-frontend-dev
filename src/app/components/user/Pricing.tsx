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
  Chip,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import {
  Check,
  ArrowBack,
  Lock,
  MovieCreation,
} from '@mui/icons-material';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import { useAuth } from '@/app/contexts/AuthContext';
import { useGeoCurrency } from '@/app/hooks/useGeoCurrency';
import { useCurrentSubscription } from '@/app/hooks/useCurrentSubscription';
import {
  STRIPE_PRICES,
  createSubscriptionCheckout,
  createCreditCheckout,
  redirectToCheckout
} from '@/services/stripe.service';
import { useSnackbar } from 'notistack';
import { ChangePlanModal } from './ChangePlanModal';

type BillingCycle = 'monthly' | 'annual';
type PlanType = 'free' | 'professional' | 'producer' | 'studio';

interface PlanFeatureSection {
  title: string;
  features: string[];
}

interface Plan {
  name: string;
  monthlyUSD: number;
  monthlyGBP: number;
  annualUSD?: number;  // per-month price when billed annually (USD)
  annualGBP?: number;  // per-month price when billed annually (GBP)
  period: string;
  description: string;
  features?: string[];
  sections?: PlanFeatureSection[];
  includesText?: string;
  footerNote?: string;
  cta: string;
  ctaSubtext?: string;
  badge?: string;
  badgeColor?: string;
  highlight?: boolean;
  planType: PlanType;
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
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

  const handleBillingCycleChange = (_: React.MouseEvent<HTMLElement>, newCycle: BillingCycle | null) => {
    if (newCycle) setBillingCycle(newCycle);
  };

  const handleCurrencyChange = (_: React.MouseEvent<HTMLElement>, newCurrency: Currency | null) => {
    if (newCurrency) setCurrency(newCurrency);
  };

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

  const handlePlanClick = async (planName: string, planType: PlanType) => {
    if (planType === 'producer' || planType === 'studio') return;
    if (planType === 'free') {
      navigate('/upload');
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

  const ctaForPlan = (plan: Plan): { label: string; disabled: boolean } => {
    if (plan.planType === 'producer' || plan.planType === 'studio') {
      return { label: 'Coming Soon', disabled: true };
    }
    if (!hasActiveSubscription || !user) {
      return { label: plan.cta, disabled: false };
    }
    if (plan.planType === 'free') {
      // Free card is meaningless for paying users — keep it visible but disabled.
      return { label: 'Continue using your plan', disabled: true };
    }
    const direction = classifyDirection(currentPlan, plan.planType);
    if (direction === 'same') {
      return { label: 'Current plan', disabled: true };
    }
    if (pendingPlan && pendingPlan === plan.planType) {
      return { label: 'Scheduled at renewal', disabled: true };
    }
    if (direction === 'upgrade') return { label: `Upgrade to ${plan.name}`, disabled: false };
    if (direction === 'downgrade') return { label: `Switch to ${plan.name}`, disabled: false };
    return { label: plan.cta, disabled: false };
  };

  const [loadingCredit, setLoadingCredit] = useState(false);

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

  const displayPrice = (plan: Plan): string => {
    if (plan.planType === 'free') return '0';
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
      period: 'month',
      description: 'Try the platform',
      features: [
        '1 script (lifetime trial)',
        'Top 3 territory recommendations',
        'Basic incentive summary',
        'Watermarked PDF download',
      ],
      cta: 'Continue for Free',
      ctaSubtext: 'No credit card required',
      planType: 'free',
    },
    {
      name: 'Professional',
      monthlyUSD: 61,
      monthlyGBP: 49,
      annualUSD: 49,
      annualGBP: 39,
      period: 'month',
      description: 'Full production intelligence',
      features: [
        '1 script per month',
        'Up to 5 territories',
        'Full 13-section report',
        'PDF report download (clean)',
        'What-If Calculator',
        'Territory Comparison',
        'Script Re-Analysis',
      ],
      cta: 'Start Professional',
      ctaSubtext: 'Cancel anytime',
      planType: 'professional',
    },
    {
      name: 'Producer',
      monthlyUSD: 149,
      monthlyGBP: 119,
      annualUSD: 119,
      annualGBP: 95,
      period: 'month',
      description: 'Scale your productions',
      badge: 'BEST VALUE',
      highlight: true,
      features: [
        '3 scripts per month',
        'All territories',
        'Everything in Professional, plus:',
        'Investor Summary PDF',
        'Excel Export',
        'Saved What-If Scenarios',
      ],
      cta: 'Start Producer',
      ctaSubtext: 'Cancel anytime',
      planType: 'producer',
    },
    {
      name: 'Studio',
      monthlyUSD: 299,
      monthlyGBP: 239,
      annualUSD: 239,
      annualGBP: 191,
      period: 'month',
      description: 'Your brand. Your reports.',
      badge: 'FOR PRODUCTION COMPANIES',
      includesText: 'Everything in Producer, plus:',
      sections: [
        {
          title: 'WHITE-LABEL',
          features: [
            'Your logo on every PDF',
            '"Prepared by [You]" footer',
            'Share Link (permanent)',
          ],
        },
        {
          title: 'VOLUME',
          features: [
            '10 scripts per month',
            'Multiple team seats',
          ],
        },
      ],
      footerNote: 'Used by production companies to deliver reports to clients',
      cta: 'Start Studio Plan',
      ctaSubtext: 'Cancel anytime',
      planType: 'studio',
    },
  ];

  return (
    <Box sx={{ bgcolor: '#000000', minHeight: '100vh' }}>
      {/* Header */}
      <Box
        sx={{
          bgcolor: 'rgba(255, 255, 255, 0.98)',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          py: 2,
        }}
      >
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <img
              src={exampleLogo}
              alt="Prodculator"
              style={{ height: '32px', width: 'auto', cursor: 'pointer' }}
              onClick={() => navigate('/')}
            />
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate('/')}
              sx={{ color: '#000000', fontWeight: 500, '&:hover': { bgcolor: 'transparent' } }}
            >
              Back to Home
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 8 }}>
        {/* Title */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, color: '#ffffff', mb: 1 }}>
            Pricing
          </Typography>
          <Typography variant="h6" sx={{ color: '#a0a0a0' }}>
            Choose the plan that fits your workflow
          </Typography>
        </Box>

        {/* Billing cycle + currency toggles */}
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 6, flexWrap: 'wrap' }}>
          {/* Billing cycle */}
          <ToggleButtonGroup
            value={billingCycle}
            exclusive
            onChange={handleBillingCycleChange}
            sx={{
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                color: '#a0a0a0',
                border: 'none',
                px: 4,
                py: 1,
                fontWeight: 600,
                '&.Mui-selected': { color: '#000000', bgcolor: '#D4AF37', '&:hover': { bgcolor: '#B8941F' } },
                '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.1)' },
              },
            }}
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="annual">
              Annual
              <Chip
                label="Save ~20%"
                size="small"
                sx={{ ml: 1, bgcolor: '#4caf50', color: '#fff', fontWeight: 700, fontSize: '0.65rem', height: 18 }}
              />
            </ToggleButton>
          </ToggleButtonGroup>

          {/* Currency */}
          <ToggleButtonGroup
            value={currency}
            exclusive
            onChange={handleCurrencyChange}
            sx={{
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(212, 175, 55, 0.3)',
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                color: '#a0a0a0',
                border: 'none',
                px: 3,
                py: 1,
                fontWeight: 600,
                fontSize: '0.85rem',
                '&.Mui-selected': { color: '#000000', bgcolor: '#D4AF37', '&:hover': { bgcolor: '#B8941F' } },
                '&:hover': { bgcolor: 'rgba(212, 175, 55, 0.1)' },
              },
            }}
          >
            <ToggleButton value="usd">$ USD</ToggleButton>
            <ToggleButton value="gbp">£ GBP</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Plan cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {plans.map((plan) => (
            <Grid size={{ xs: 12, md: 3 }} key={plan.planType}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: plan.highlight ? '2px solid #D4AF37' : '1px solid rgba(212, 175, 55, 0.2)',
                  bgcolor: plan.highlight ? 'rgba(212, 175, 55, 0.05)' : '#0a0a0a',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  boxShadow: plan.highlight ? '0 0 30px rgba(212, 175, 55, 0.3)' : 'none',
                  '&:hover': {
                    borderColor: '#D4AF37',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                {plan.badge && (
                  <Chip
                    label={plan.badge}
                    size="medium"
                    sx={{
                      position: 'absolute',
                      top: -7,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: plan.highlight ? '#D4AF37' : 'rgba(212, 175, 55, 0.15)',
                      color: plan.highlight ? '#000000' : '#D4AF37',
                      fontWeight: 800,
                      fontSize: '0.75rem',
                      px: 2,
                      height: 28,
                      boxShadow: plan.highlight ? '0 4px 12px rgba(212, 175, 55, 0.5)' : 'none',
                    }}
                  />
                )}

                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4 }}>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ py: 2, fontWeight: 600, color: '#ffffff' }}
                  >
                    {plan.name}
                  </Typography>

                  {/* Price */}
                  <Box sx={{ mb: 1 }}>
                    <Typography
                      variant="h3"
                      component="span"
                      sx={{ fontWeight: 700, color: '#D4AF37' }}
                    >
                      {symbol}{displayPrice(plan)}
                    </Typography>
                    {plan.planType !== 'free' && (
                      <Typography variant="body1" component="span" sx={{ color: '#a0a0a0' }}>
                        {' '}/ month
                      </Typography>
                    )}
                  </Box>

                  {/* Annual billing note */}
                  {billingCycle === 'annual' && plan.planType !== 'free' && (plan.annualGBP != null || plan.annualUSD != null) && (
                    <Typography variant="body2" sx={{ color: '#4caf50', mb: 1 }}>
                      {isGBP && plan.annualGBP != null
                        ? `Billed £${plan.annualGBP * 12}/year`
                        : plan.annualUSD != null
                        ? `Billed $${plan.annualUSD * 12}/year`
                        : 'Billed annually'}
                    </Typography>
                  )}

                  <Typography variant="body2" sx={{ mb: 3, color: '#a0a0a0' }}>
                    {plan.description}
                  </Typography>

                  {/* Feature list */}
                  {plan.sections ? (
                    <Box sx={{ flex: 1 }}>
                      {plan.includesText && (
                        <Typography
                          variant="caption"
                          sx={{ color: '#a0a0a0', fontStyle: 'italic', display: 'block', mb: 1 }}
                        >
                          {plan.includesText}
                        </Typography>
                      )}
                      {plan.sections.map((section, sIdx) => (
                        <Box key={sIdx} sx={{ mb: 2 }}>
                          <Typography
                            variant="overline"
                            sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em' }}
                          >
                            {section.title}
                          </Typography>
                          <List dense>
                            {section.features.map((feature, fIdx) => (
                              <ListItem key={fIdx} sx={{ py: 0.5, px: 0 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <Check sx={{ color: '#4caf50', fontSize: 18 }} />
                                </ListItemIcon>
                                <ListItemText
                                  primary={feature}
                                  primaryTypographyProps={{ variant: 'body2', sx: { color: '#ffffff' } }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      ))}
                      {/* Gated UI items */}
                      <Box>
                        <Typography
                          variant="overline"
                          sx={{ color: '#D4AF37', fontWeight: 700, fontSize: '0.7rem', letterSpacing: '0.1em' }}
                        >
                          COMING SOON
                        </Typography>
                        <List dense>
                          {['Share Link (permanent URL)'].map((feature, fIdx) => (
                            <ListItem key={fIdx} sx={{ py: 0.5, px: 0, opacity: 0.5 }}>
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <Lock sx={{ color: '#a0a0a0', fontSize: 16 }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={feature}
                                primaryTypographyProps={{ variant: 'body2', sx: { color: '#a0a0a0' } }}
                              />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                      {plan.footerNote && (
                        <Typography
                          variant="caption"
                          sx={{ color: '#a0a0a0', fontStyle: 'italic', display: 'block', textAlign: 'center', mt: 2 }}
                        >
                          {plan.footerNote}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <List sx={{ flex: 1 }}>
                      {plan.features!.map((feature, idx) => (
                        <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <Check sx={{ color: '#4caf50', fontSize: 18 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={feature}
                            primaryTypographyProps={{ variant: 'body2', sx: { color: '#ffffff' } }}
                          />
                        </ListItem>
                      ))}
                      {/* Gated UI: Excel Export for Producer */}
                      {plan.planType === 'producer' && (
                        <ListItem sx={{ py: 0.5, px: 0, opacity: 0.5 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <Lock sx={{ color: '#a0a0a0', fontSize: 16 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary="Excel Export (coming soon)"
                            primaryTypographyProps={{ variant: 'body2', sx: { color: '#a0a0a0' } }}
                          />
                        </ListItem>
                      )}
                    </List>
                  )}

                  {(() => {
                    const cta = ctaForPlan(plan);
                    return (
                      <Button
                        variant={plan.highlight ? 'contained' : 'outlined'}
                        size="large"
                        fullWidth
                        sx={{
                          mt: 2,
                          ...(plan.highlight
                            ? {
                                bgcolor: '#D4AF37',
                                color: '#000000',
                                fontWeight: 600,
                                '&:hover': { bgcolor: '#B8941F' },
                              }
                            : {
                                borderColor: '#D4AF37',
                                color: '#D4AF37',
                                '&:hover': { borderColor: '#D4AF37', bgcolor: 'rgba(212, 175, 55, 0.1)' },
                              }),
                        }}
                        onClick={() => handlePlanClick(plan.name, plan.planType)}
                        disabled={!!loadingPlan || cta.disabled}
                      >
                        {loadingPlan === plan.name ? <CircularProgress size={24} color="inherit" /> : cta.label}
                      </Button>
                    );
                  })()}

                  {plan.ctaSubtext && (
                    <Typography
                      variant="caption"
                      sx={{ color: '#a0a0a0', display: 'block', textAlign: 'center', mt: 1, fontStyle: 'italic' }}
                    >
                      {plan.ctaSubtext}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Pay-as-you-go panel */}
        <Paper
          sx={{
            p: { xs: 3, md: 5 },
            mb: 6,
            bgcolor: '#0a0a0a',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            borderRadius: 3,
          }}
        >
          <Grid container spacing={4} alignItems="center">
            {/* Left — description */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <MovieCreation sx={{ color: '#D4AF37', fontSize: 20 }} />
                <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 700, letterSpacing: '0.12em' }}>
                  Pay Once · No Subscription
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 700, mb: 1.5 }}>
                Just need one report?
              </Typography>
              <Typography variant="body1" sx={{ color: '#a0a0a0', mb: 3, lineHeight: 1.7 }}>
                Get a full professional report for a single production with no commitment. Everything in the Professional plan — charged once, never expires.
              </Typography>
              <Grid container spacing={1}>
                {[
                  'Full 13-section report',
                  'All available territories',
                  'Clean PDF download',
                  'Tax incentive analysis',
                  'Financial scenarios',
                  'Report saved to your dashboard',
                ].map((feature) => (
                  <Grid size={{ xs: 12, sm: 6 }} key={feature}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Check sx={{ color: '#4caf50', fontSize: 16, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: '#ffffff' }}>{feature}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Right — price + CTA */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  textAlign: 'center',
                  p: { xs: 3, md: 4 },
                  border: '1px solid rgba(212, 175, 55, 0.35)',
                  borderRadius: 2,
                  bgcolor: 'rgba(212, 175, 55, 0.04)',
                }}
              >
                <Typography variant="h2" sx={{ color: '#D4AF37', fontWeight: 700, lineHeight: 1 }}>
                  {isGBP ? '£35' : '$40'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0a0', mt: 0.5, mb: 3 }}>
                  one-time &nbsp;·&nbsp; no subscription &nbsp;·&nbsp; never expires
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleCreditCheckout}
                  disabled={loadingCredit}
                  sx={{
                    bgcolor: '#D4AF37',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: '1rem',
                    py: 1.5,
                    '&:hover': { bgcolor: '#B8941F' },
                    '&.Mui-disabled': { bgcolor: 'rgba(212,175,55,0.3)', color: 'rgba(0,0,0,0.4)' },
                  }}
                >
                  {loadingCredit ? <CircularProgress size={24} color="inherit" /> : 'Buy a Single Report'}
                </Button>
                <Typography variant="caption" sx={{ color: '#666', display: 'block', mt: 1.5 }}>
                  Secure checkout via Stripe. Credit added immediately after payment.
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>

        {/* Platform Economics — admin only */}
        {hasAdminPermission('canViewPlatformEconomics') && (
          <Paper
            sx={{
              p: 4,
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(212, 175, 55, 0.2)',
              mb: 6,
            }}
          >
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, color: '#ffffff' }}>
              Platform Economics
            </Typography>
            <Grid container spacing={3}>
              {[
                { label: 'Avg. Cost Per Report', value: '~$0.30', sub: 'AI processing + infrastructure', color: '#D4AF37' },
                { label: 'Gross Margin', value: '~99%', sub: 'Highly scalable model', color: '#4caf50' },
                { label: 'Scalability', value: 'Infinite', sub: 'Marginal cost near zero', color: '#D4AF37' },
              ].map(({ label, value, sub, color }) => (
                <Grid size={{ xs: 12, sm: 4 }} key={label}>
                  <Card sx={{ bgcolor: '#000000', border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <CardContent>
                      <Typography variant="overline" sx={{ color: '#a0a0a0' }}>{label}</Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color }}>{value}</Typography>
                      <Typography variant="caption" sx={{ color: '#a0a0a0' }}>{sub}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

      </Container>

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
