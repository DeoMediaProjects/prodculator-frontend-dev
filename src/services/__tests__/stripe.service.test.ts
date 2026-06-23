import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
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

  it('professional monthly USD has amount 100 (= $1.00)', () => {
    expect(STRIPE_PRICES.professionalMonthlyUSD.amount).toBe(100);
    expect(STRIPE_PRICES.professionalMonthlyUSD.currency).toBe('usd');
  });

  it('professional monthly GBP has amount 79 (= £0.79)', () => {
    expect(STRIPE_PRICES.professionalMonthlyGBP.amount).toBe(79);
    expect(STRIPE_PRICES.professionalMonthlyGBP.currency).toBe('gbp');
  });

  it('professional plans have reportLimit of 1', () => {
    expect(STRIPE_PRICES.professionalMonthlyUSD.reportLimit).toBe(1);
    expect(STRIPE_PRICES.professionalMonthlyGBP.reportLimit).toBe(1);
    expect(STRIPE_PRICES.professionalAnnualGBP.reportLimit).toBe(1);
  });

  it('professional annual GBP has amount 79 (= £0.79/month)', () => {
    expect(STRIPE_PRICES.professionalAnnualGBP.amount).toBe(79);
    expect(STRIPE_PRICES.professionalAnnualGBP.currency).toBe('gbp');
  });

  // ── Producer ──────────────────────────────────────────────────────────────

  it('producer monthly USD has amount 100 (= $1.00)', () => {
    expect(STRIPE_PRICES.producerMonthlyUSD.amount).toBe(100);
    expect(STRIPE_PRICES.producerMonthlyUSD.currency).toBe('usd');
  });

  it('producer monthly GBP has amount 79 (= £0.79)', () => {
    expect(STRIPE_PRICES.producerMonthlyGBP.amount).toBe(79);
    expect(STRIPE_PRICES.producerMonthlyGBP.currency).toBe('gbp');
  });

  it('producer plans have reportLimit of 3', () => {
    expect(STRIPE_PRICES.producerMonthlyUSD.reportLimit).toBe(3);
    expect(STRIPE_PRICES.producerMonthlyGBP.reportLimit).toBe(3);
    expect(STRIPE_PRICES.producerAnnualGBP.reportLimit).toBe(3);
  });

  it('producer annual GBP has amount 79 (= £0.79/month)', () => {
    expect(STRIPE_PRICES.producerAnnualGBP.amount).toBe(79);
    expect(STRIPE_PRICES.producerAnnualGBP.currency).toBe('gbp');
  });

  // ── Studio ───────────────────────────────────────────────────────────────

  it('studio monthly USD has amount 100 (= $1.00)', () => {
    expect(STRIPE_PRICES.studioMonthlyUSD.amount).toBe(100);
  });

  it('studio plans have reportLimit of 10', () => {
    expect(STRIPE_PRICES.studioMonthlyUSD.reportLimit).toBe(10);
    expect(STRIPE_PRICES.studioMonthlyGBP.reportLimit).toBe(10);
    expect(STRIPE_PRICES.studioAnnualGBP.reportLimit).toBe(10);
  });

  it('studio annual GBP has amount 79 (= £0.79/month)', () => {
    expect(STRIPE_PRICES.studioAnnualGBP.amount).toBe(79);
    expect(STRIPE_PRICES.studioAnnualGBP.currency).toBe('gbp');
  });
});

describe('createSubscriptionCheckout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends price_id and plan_type in request body', async () => {
    mockPost.mockResolvedValueOnce({ session_id: 'cs_test', url: 'https://checkout.stripe.com/test' });

    await createSubscriptionCheckout('price_pro_usd', 'user@test.com', 'user-1', 'professional');

    expect(mockPost).toHaveBeenCalledWith(
      '/api/payments/subscription-checkout',
      { price_id: 'price_pro_usd', plan_type: 'professional' },
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
