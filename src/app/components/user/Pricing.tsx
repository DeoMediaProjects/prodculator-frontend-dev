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
} from '@mui/material';
import {
  Check,
  ArrowBack,
  CloudUpload,
} from '@mui/icons-material';
import exampleLogo from '@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png';
import { useAuth } from '@/app/contexts/AuthContext';
import { useGeoCurrency, convertPrice } from '@/app/hooks/useGeoCurrency';
import { 
  STRIPE_PRICES, 
  createCheckoutSession, 
  createSubscriptionCheckout, 
  redirectToCheckout 
} from '@/services/stripe.service';
import { useSnackbar } from 'notistack';

export function Pricing() {
  const navigate = useNavigate();
  const { hasAdminPermission, user } = useAuth();
  const { symbol, isUK } = useGeoCurrency();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const handlePlanClick = async (planName: string, planType: 'free' | 'single' | 'studio') => {
    // Free plan - just navigate to upload
    if (planType === 'free') {
      navigate('/upload');
      return;
    }

    // Check if user has email
    const userEmail = user?.email || prompt('Please enter your email address:');
    if (!userEmail) {
      enqueueSnackbar('Email is required to proceed with payment', { variant: 'error' });
      return;
    }

    setLoadingPlan(planName);

    try {
      if (planType === 'single') {
        // One-time payment for Single Script Report
        const priceId = isUK 
          ? STRIPE_PRICES.singleReportGBP.priceId 
          : STRIPE_PRICES.singleReportUSD.priceId;
        
        const { url, error } = await createCheckoutSession(priceId, userEmail);
        
        if (error) {
          enqueueSnackbar(`Payment error: ${error}`, { variant: 'error' });
          console.error('Checkout error:', error);
          return;
        }

        // Redirect to Stripe Checkout
        if (url) {
          await redirectToCheckout(url);
        } else {
          enqueueSnackbar('No checkout URL received', { variant: 'error' });
        }
      } else if (planType === 'studio') {
        // Subscription for Studio Plan
        const priceId = isUK 
          ? STRIPE_PRICES.studioMonthlyGBP.priceId 
          : STRIPE_PRICES.studioMonthlyUSD.priceId;
        
        const { url, error } = await createSubscriptionCheckout(
          priceId, 
          userEmail, 
          user?.email || ''
        );
        
        if (error) {
          enqueueSnackbar(`Payment error: ${error}`, { variant: 'error' });
          console.error('Subscription error:', error);
          return;
        }

        // Redirect to Stripe Checkout
        if (url) {
          await redirectToCheckout(url);
        } else {
          enqueueSnackbar('No checkout URL received', { variant: 'error' });
        }
      }
    } catch (error: any) {
      console.error('Payment flow error:', error);
      enqueueSnackbar(`Failed to start payment: ${error.message || 'Unknown error'}`, { variant: 'error' });
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: 'Free',
      priceUSD: 0,
      period: 'month',
      description: 'Explore the platform',
      features: [
        '1 script trial only', // ✅ ANNOTATION: One-time registration gate, not monthly renewal. Once-off lifetime allocation per email.
        'Top 3 territory recommendations',
        'Basic incentive summary',
        'Sample report download',
      ],
      cta: 'Continue for Free', // Updated CTA copy
      ctaSubtext: 'No credit card required', // New sub-copy
      popular: false,
      planType: 'free' as const,
    },
    {
      name: 'Professional',
      priceUSD: 61,
      priceGBP: 49,
      period: 'month',
      subPrice: '£39/month billed annually',
      description: 'Full production intelligence',
      cancellable: true,
      features: [
        '3 scripts per month', // ✅ CONFIRMED: 3 scripts per month is correct
        'Full 15-territory analysis',
        'Currency & crew advantage data',
        'Investor Summary panel',
        'PDF report download',
        'What-If Calculator',
        'Comparables section',
      ],
      cta: 'Start Professional',
      popular: true,
      planType: 'single' as const,
    },
    {
      name: 'Studio',
      priceUSD: 299,
      priceGBP: 239,
      period: 'month',
      description: 'Your brand. Your reports.',
      badge: 'FOR PRODUCTION COMPANIES',
      cancellable: true,
      includesText: 'Includes everything in Professional, plus:',
      sections: [
        {
          title: 'WHITE-LABEL',
          features: [
            'Your logo on every PDF',
            '"Prepared by [You]" footer',
            'Permanent share links',
          ],
        },
        {
          title: 'VOLUME',
          features: [
            '10 scripts per month',
            'Multiple team seats',
            'Save What-If scenarios', // ✅ CONFIRMED: Already present
            'Excel export', // ✅ CONFIRMED: Excel export stays (decision to remove reversed)
          ],
        },
      ],
      footerNote: 'Used by production companies to deliver reports to clients',
      cta: 'Start Studio Plan',
      popular: false,
      planType: 'studio' as const,
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <img 
                src={exampleLogo} 
                alt="Prodculator" 
                style={{ height: '32px', width: 'auto', cursor: 'pointer' }}
                onClick={() => navigate('/')}
              />
            </Box>
            <Button 
              startIcon={<ArrowBack />} 
              onClick={() => navigate('/')}
              sx={{
                color: '#000000',
                fontWeight: 500,
                '&:hover': { bgcolor: 'transparent' }
              }}
            >
              Back to Home
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="xl" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            Pricing
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: '#a0a0a0',
            }}
          >
            Choose the plan that fits your workflow
          </Typography>
        </Box>

        <Grid container spacing={3} sx={{ mb: 8 }}>
          {plans.map((plan, index) => (
            <Grid size={{ xs: 12, md: 4 }} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  border: plan.popular ? '2px solid #D4AF37' : '1px solid rgba(212, 175, 55, 0.2)',
                  bgcolor: plan.popular ? 'rgba(212, 175, 55, 0.05)' : '#0a0a0a',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  boxShadow: plan.popular ? '0 0 30px rgba(212, 175, 55, 0.3)' : 'none',
                  '&:hover': {
                    borderColor: '#D4AF37',
                    transform: 'translateY(-4px)',
                  }
                }}
              >
                {plan.popular && (
                  <Chip
                    label="MOST POPULAR"
                    size="medium"
                    sx={{
                      position: 'absolute',
                      top: -16,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      bgcolor: '#D4AF37',
                      color: '#000000',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      px: 2,
                      py: 4,
                      height: 32,
                      boxShadow: '0 4px 12px rgba(212, 175, 55, 0.5)',
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { transform: 'translateX(-50%) scale(1)' },
                        '50%': { transform: 'translateX(-50%) scale(1.05)' },
                      },
                    }}
                  />
                )}
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 4 }}>
                  <Typography 
                    variant="h6" 
                    gutterBottom 
                    sx={{ 
                      py:3,
                      fontWeight: 600,
                      color: '#ffffff',
                    }}
                  >
                    {plan.name}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography 
                      variant="h3" 
                      component="span" 
                      sx={{ 
                        fontWeight: 700,
                        color: '#D4AF37',
                      }}
                    >
                      {symbol}{plan.priceGBP && isUK ? plan.priceGBP : convertPrice(plan.priceUSD, isUK)}
                    </Typography>
                    <Typography 
                      variant="body1" 
                      component="span" 
                      sx={{ 
                        color: '#a0a0a0',
                      }}
                    >
                      {' '}/ {plan.period}
                    </Typography>
                    {plan.subPrice && isUK && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: '#4caf50',
                          mt: 0.5,
                        }}
                      >
                        {plan.subPrice}
                      </Typography>
                    )}
                  </Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mb: 3,
                      color: '#a0a0a0',
                    }}
                  >
                    {plan.description}
                  </Typography>
                  {plan.badge && (
                    <Chip
                      label={plan.badge}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(212, 175, 55, 0.15)',
                        color: '#D4AF37',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        mb: 2,
                      }}
                    />
                  )}
                  {plan.sections ? (
                    <Box sx={{ flex: 1 }}>
                      {plan.includesText && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#a0a0a0',
                            fontStyle: 'italic',
                            display: 'block',
                            textAlign: 'center',
                            mt: 2,
                          }}
                        >
                          {plan.includesText}
                        </Typography>
                      )}
                      {plan.sections.map((section, sIdx) => (
                        <Box key={sIdx} sx={{ mb: 3 }}>
                          <Typography
                            variant="overline"
                            sx={{
                              color: '#D4AF37',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              letterSpacing: '0.1em',
                            }}
                          >
                            {section.title}
                          </Typography>
                          <List dense>
                            {section.features.map((feature, fIdx) => (
                              <ListItem key={fIdx} sx={{ py: 0.5, px: 0 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                  <Check sx={{ color: '#4caf50' }} />
                                </ListItemIcon>
                                <ListItemText
                                  primary={feature}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                    sx: { color: '#ffffff' },
                                  }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        </Box>
                      ))}
                      {plan.footerNote && (
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#a0a0a0',
                            fontStyle: 'italic',
                            display: 'block',
                            textAlign: 'center',
                            mt: 2,
                          }}
                        >
                          {plan.footerNote}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <List sx={{ flex: 1 }}>
                      {plan.features.map((feature, idx) => (
                        <ListItem key={idx} sx={{ py: 0.5, px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <Check sx={{ color: '#4caf50' }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={feature}
                            primaryTypographyProps={{ 
                              variant: 'body2',
                              sx: { color: '#ffffff' }
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                  <Button
                    variant={plan.popular ? 'contained' : 'outlined'}
                    size="large"
                    fullWidth
                    sx={{ 
                      mt: 2,
                      ...(plan.popular ? {
                        bgcolor: '#D4AF37',
                        color: '#000000',
                        fontWeight: 600,
                        '&:hover': {
                          bgcolor: '#D4AF37',
                        }
                      } : {
                        borderColor: '#D4AF37',
                        color: '#D4AF37',
                        '&:hover': {
                          borderColor: '#D4AF37',
                          bgcolor: 'rgba(212, 175, 55, 0.1)',
                        }
                      })
                    }}
                    onClick={() => handlePlanClick(plan.name, plan.planType)}
                    disabled={!!loadingPlan}
                  >
                    {loadingPlan === plan.name ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      plan.cta
                    )}
                  </Button>
                  {plan.cancellable && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#a0a0a0',
                        display: 'block',
                        textAlign: 'center',
                        mt: 1,
                        fontStyle: 'italic',
                      }}
                    >
                      Can be cancelled anytime
                    </Typography>
                  )}
                  {plan.ctaSubtext && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#a0a0a0',
                        display: 'block',
                        textAlign: 'center',
                        mt: 1,
                        fontStyle: 'italic',
                      }}
                    >
                      {plan.ctaSubtext}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Unit Economics for Investors - Only visible to admins */}
        {hasAdminPermission('canViewPlatformEconomics') && (
          <Paper 
            sx={{ 
              p: 4,
              bgcolor: '#0a0a0a',
              border: '1px solid rgba(212, 175, 55, 0.2)',
            }}
          >
            <Typography 
              variant="h5" 
              gutterBottom 
              sx={{ 
                fontWeight: 600,
                color: '#ffffff',
              }}
            >
              Platform Economics
            </Typography>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card 
                  sx={{
                    bgcolor: '#000000',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                  }}
                >
                  <CardContent>
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: '#a0a0a0',
                      }}
                    >
                      Avg. Cost Per Report
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 600,
                        color: '#D4AF37',
                      }}
                    >
                      ~$0.30
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#a0a0a0',
                      }}
                    >
                      AI processing + infrastructure
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card 
                  sx={{
                    bgcolor: '#000000',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                  }}
                >
                  <CardContent>
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: '#a0a0a0',
                      }}
                    >
                      Gross Margin
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 600,
                        color: '#4caf50',
                      }}
                    >
                      ~99%
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#a0a0a0',
                      }}
                    >
                      Highly scalable model
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <Card 
                  sx={{
                    bgcolor: '#000000',
                    border: '1px solid rgba(212, 175, 55, 0.2)',
                  }}
                >
                  <CardContent>
                    <Typography 
                      variant="overline" 
                      sx={{ 
                        color: '#a0a0a0',
                      }}
                    >
                      Scalability
                    </Typography>
                    <Typography 
                      variant="h4" 
                      sx={{ 
                        fontWeight: 600,
                        color: '#D4AF37',
                      }}
                    >
                      Infinite
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: '#a0a0a0',
                      }}
                    >
                      Marginal cost near zero
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* CTA */}
        <Box sx={{ textAlign: 'center', mt: 6 }}>
          <Button
            variant="contained"
            size="large"
            startIcon={<CloudUpload />}
            onClick={() => handlePlanClick('Free Preview', 'free')}
            sx={{ 
              px: 6, 
              py: 1.5,
              bgcolor: '#D4AF37',
              color: '#000000',
              fontWeight: 600,
              '&:hover': {
                bgcolor: '#D4AF37',
              }
            }}
          >
            Start with Free Report
          </Button>
        </Box>
      </Container>
    </Box>
  );
}