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
  it('professional monthly USD has amount 6100 (= $61.00)', () => {
    expect(STRIPE_PRICES.professionalMonthlyUSD.amount).toBe(6100);
    expect(STRIPE_PRICES.professionalMonthlyUSD.currency).toBe('usd');
  });

  it('professional monthly GBP has amount 4900 (= £49.00)', () => {
    expect(STRIPE_PRICES.professionalMonthlyGBP.amount).toBe(4900);
    expect(STRIPE_PRICES.professionalMonthlyGBP.currency).toBe('gbp');
  });

  it('professional plans have reportLimit of 3', () => {
    expect(STRIPE_PRICES.professionalMonthlyUSD.reportLimit).toBe(3);
    expect(STRIPE_PRICES.professionalMonthlyGBP.reportLimit).toBe(3);
  });

  it('studio monthly USD has amount 29900 (= $299.00)', () => {
    expect(STRIPE_PRICES.studioMonthlyUSD.amount).toBe(29900);
  });

  it('studio plans have reportLimit of -1 (unlimited)', () => {
    expect(STRIPE_PRICES.studioMonthlyUSD.reportLimit).toBe(-1);
    expect(STRIPE_PRICES.studioMonthlyGBP.reportLimit).toBe(-1);
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
