import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PLAN_PRICING,
  STRIPE_PRICES,
  createSubscriptionCheckout,
  formatPrice,
  detectUserCurrency,
} from '../stripe.service';

// Mock apiClient so no real HTTP requests are made
vi.mock('../api', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

import { apiClient } from '../api';
const mockPost = vi.mocked(apiClient.post);

describe('STRIPE_PRICES', () => {
  // ── Professional ─────────────────────────────────────────────────────────

  it('professional monthly USD is $61.00', () => {
    expect(STRIPE_PRICES.professionalMonthlyUSD.amount).toBe(6100);
    expect(STRIPE_PRICES.professionalMonthlyUSD.currency).toBe('usd');
  });

  it('professional monthly GBP is £49.00', () => {
    expect(STRIPE_PRICES.professionalMonthlyGBP.amount).toBe(4900);
    expect(STRIPE_PRICES.professionalMonthlyGBP.currency).toBe('gbp');
  });

  it('professional plans have reportLimit of 1', () => {
    expect(STRIPE_PRICES.professionalMonthlyUSD.reportLimit).toBe(1);
    expect(STRIPE_PRICES.professionalMonthlyGBP.reportLimit).toBe(1);
    expect(STRIPE_PRICES.professionalAnnualGBP.reportLimit).toBe(1);
  });

  it('professional annual GBP is £468.00 charged yearly', () => {
    expect(STRIPE_PRICES.professionalAnnualGBP.amount).toBe(46800);
    expect(STRIPE_PRICES.professionalAnnualGBP.currency).toBe('gbp');
  });

  // ── Producer ──────────────────────────────────────────────────────────────

  it('producer monthly USD is $149.00', () => {
    expect(STRIPE_PRICES.producerMonthlyUSD.amount).toBe(14900);
    expect(STRIPE_PRICES.producerMonthlyUSD.currency).toBe('usd');
  });

  it('producer monthly GBP is £119.00', () => {
    expect(STRIPE_PRICES.producerMonthlyGBP.amount).toBe(11900);
    expect(STRIPE_PRICES.producerMonthlyGBP.currency).toBe('gbp');
  });

  it('producer plans have reportLimit of 3', () => {
    expect(STRIPE_PRICES.producerMonthlyUSD.reportLimit).toBe(3);
    expect(STRIPE_PRICES.producerMonthlyGBP.reportLimit).toBe(3);
    expect(STRIPE_PRICES.producerAnnualGBP.reportLimit).toBe(3);
  });

  it('producer annual GBP is £1,140.00 charged yearly', () => {
    expect(STRIPE_PRICES.producerAnnualGBP.amount).toBe(114000);
    expect(STRIPE_PRICES.producerAnnualGBP.currency).toBe('gbp');
  });

  // ── Studio ───────────────────────────────────────────────────────────────

  it('studio monthly USD is $299.00', () => {
    expect(STRIPE_PRICES.studioMonthlyUSD.amount).toBe(29900);
  });

  it('studio plans have reportLimit of 10', () => {
    expect(STRIPE_PRICES.studioMonthlyUSD.reportLimit).toBe(10);
    expect(STRIPE_PRICES.studioMonthlyGBP.reportLimit).toBe(10);
    expect(STRIPE_PRICES.studioAnnualGBP.reportLimit).toBe(10);
  });

  it('studio annual GBP is £2,388.00 charged yearly', () => {
    expect(STRIPE_PRICES.studioAnnualGBP.amount).toBe(238800);
    expect(STRIPE_PRICES.studioAnnualGBP.currency).toBe('gbp');
  });
});

describe('createSubscriptionCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends price_id, plan_type, currency and billing_cycle in request body', async () => {
    mockPost.mockResolvedValueOnce({ session_id: 'cs_test', url: 'https://checkout.stripe.com/test' });

    await createSubscriptionCheckout('price_pro_usd', 'user@test.com', 'user-1', 'professional');

    // currency and billing_cycle travel with the request so the backend can
    // resolve the price from its own config when the build-time price_id is
    // empty. This assertion previously omitted them and had gone stale.
    expect(mockPost).toHaveBeenCalledWith(
      '/api/payments/subscription-checkout',
      {
        price_id: 'price_pro_usd',
        plan_type: 'professional',
        currency: 'usd',
        billing_cycle: 'monthly',
      },
      { auth: true }
    );
  });

  it('returns sessionId and url on success', async () => {
    mockPost.mockResolvedValueOnce({ session_id: 'cs_sub_123', url: 'https://checkout.stripe.com/sub' });

    const result = await createSubscriptionCheckout('price_xxx', 'user@test.com', 'user-1');

    expect(result.sessionId).toBe('cs_sub_123');
    expect(result.url).toBe('https://checkout.stripe.com/sub');
    expect(result.error).toBeUndefined();
  });

  it('defaults plan_type to professional', async () => {
    mockPost.mockResolvedValueOnce({ session_id: 'cs_sub', url: 'https://checkout.stripe.com' });

    await createSubscriptionCheckout('price_xxx', 'user@test.com', 'user-1');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/payments/subscription-checkout',
      expect.objectContaining({ plan_type: 'professional' }),
      { auth: true }
    );
  });

  it('sends producer plan_type for producer checkout', async () => {
    mockPost.mockResolvedValueOnce({ session_id: 'cs_producer', url: 'https://checkout.stripe.com/producer' });

    await createSubscriptionCheckout('price_producer_gbp', 'user@test.com', 'user-1', 'producer');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/payments/subscription-checkout',
      expect.objectContaining({ plan_type: 'producer' }),
      { auth: true }
    );
  });

  it('sends studio plan_type for studio checkout', async () => {
    mockPost.mockResolvedValueOnce({ session_id: 'cs_studio', url: 'https://checkout.stripe.com/studio' });

    await createSubscriptionCheckout('price_studio_usd', 'user@test.com', 'user-1', 'studio');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/payments/subscription-checkout',
      expect.objectContaining({ plan_type: 'studio' }),
      { auth: true }
    );
  });

  it('returns error string on failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));

    const result = await createSubscriptionCheckout('price_xxx', 'user@test.com', 'user-1');

    expect(result.sessionId).toBe('');
    expect(result.error).toBe('Network error');
  });
});

describe('formatPrice', () => {
  it('formats USD amount in cents to dollar string', () => {
    expect(formatPrice(6100, 'usd')).toBe('$61.00');
  });

  it('formats GBP amount in pence to pound string', () => {
    expect(formatPrice(4900, 'gbp')).toBe('£49.00');
  });

  it('formats producer USD price', () => {
    expect(formatPrice(14900, 'usd')).toBe('$149.00');
  });

  it('formats producer GBP price', () => {
    expect(formatPrice(11900, 'gbp')).toBe('£119.00');
  });

  it('formats studio USD price', () => {
    expect(formatPrice(29900, 'usd')).toBe('$299.00');
  });
});

describe('detectUserCurrency', () => {
  it('returns gbp for GB country code', () => {
    expect(detectUserCurrency('GB')).toBe('gbp');
  });

  it('returns gbp for United Kingdom country name', () => {
    expect(detectUserCurrency('United Kingdom')).toBe('gbp');
  });

  it('returns usd by default', () => {
    expect(detectUserCurrency('US')).toBe('usd');
    expect(detectUserCurrency(undefined)).toBe('usd');
  });
});

describe('PLAN_PRICING matches the published schedule', () => {
  // Guards the defect this file previously encoded: every plan advertised
  // $1.00/£0.79 while Stripe charged the real amount, so the pricing page and
  // the invoice disagreed. These literals are the published schedule
  // (compiled 29 Jul 2026) and were reconciled against live Stripe — if a
  // number here changes, the Stripe price must change with it.
  const SCHEDULE = {
    singleReport: { monthlyUSD: 40, monthlyGBP: 35 },
    professional: { monthlyUSD: 61, monthlyGBP: 49, annualTotalUSD: 588, annualTotalGBP: 468 },
    producer: { monthlyUSD: 149, monthlyGBP: 119, annualTotalUSD: 1428, annualTotalGBP: 1140 },
    studio: { monthlyUSD: 299, monthlyGBP: 239, annualTotalUSD: 2868, annualTotalGBP: 2388 },
  } as const;

  it('no plan is still priced at the $1 / £0.79 test amount', () => {
    for (const [name, p] of Object.entries(PLAN_PRICING)) {
      expect(p.monthlyUSD, `${name} USD`).toBeGreaterThan(1);
      expect(p.monthlyGBP, `${name} GBP`).toBeGreaterThan(1);
    }
  });

  it.each(Object.keys(SCHEDULE))('%s monthly prices match the schedule', (plan) => {
    const key = plan as keyof typeof SCHEDULE;
    expect(PLAN_PRICING[key].monthlyUSD).toBe(SCHEDULE[key].monthlyUSD);
    expect(PLAN_PRICING[key].monthlyGBP).toBe(SCHEDULE[key].monthlyGBP);
  });

  it.each(['professional', 'producer', 'studio'] as const)(
    '%s annual total equals 12x the advertised per-month rate',
    (plan) => {
      const p = PLAN_PRICING[plan];
      // The per-month figure on the card must reconcile with the yearly charge,
      // otherwise the card understates what leaves the customer's account.
      expect(p.annualUSD * 12).toBe(p.annualTotalUSD);
      expect(p.annualGBP * 12).toBe(p.annualTotalGBP);
    },
  );

  it.each(['professional', 'producer', 'studio'] as const)(
    '%s annual totals match the schedule',
    (plan) => {
      expect(PLAN_PRICING[plan].annualTotalUSD).toBe(SCHEDULE[plan].annualTotalUSD);
      expect(PLAN_PRICING[plan].annualTotalGBP).toBe(SCHEDULE[plan].annualTotalGBP);
    },
  );

  it('STRIPE_PRICES.amount mirrors PLAN_PRICING in minor units', () => {
    expect(STRIPE_PRICES.professionalMonthlyGBP.amount).toBe(PLAN_PRICING.professional.monthlyGBP * 100);
    expect(STRIPE_PRICES.studioAnnualUSD.amount).toBe(PLAN_PRICING.studio.annualTotalUSD * 100);
    expect(STRIPE_PRICES.singleReportGBP.amount).toBe(PLAN_PRICING.singleReport.monthlyGBP * 100);
  });
});
