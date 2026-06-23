/**
 * Stripe Payment Service (backend routed)
 *
 * All card data flows through Stripe Checkout — we never handle raw card numbers.
 * This keeps the integration at PCI SAQ-A compliance level.
 */

import { apiClient } from './api';

// B2C pricing flattened to $1.00 USD / £0.79 GBP across every plan and cycle.
// These amounts are display/reference only — the charged amount comes from the
// Stripe price ID (VITE_STRIPE_PRICE_*). New $1 Stripe prices must back these IDs.
export const STRIPE_PRICES = {
  // ── Pay-per-report (one-time) ──────────────────────────────────────────────
  singleReportUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_SINGLE_USD || '',
    amount: 100,
    currency: 'usd',
    name: 'Single Script Report (USD)',
  },
  singleReportGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_SINGLE_GBP || '',
    amount: 79,
    currency: 'gbp',
    name: 'Single Script Report (GBP)',
  },

  // ── Professional ───────────────────────────────────────────────────────────
  professionalMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_USD || '',
    amount: 100,
    currency: 'usd',
    name: 'Professional Monthly (USD)',
    reportLimit: 1,
  },
  professionalMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_GBP || '',
    amount: 79,
    currency: 'gbp',
    name: 'Professional Monthly (GBP)',
    reportLimit: 1,
  },
  professionalAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_ANNUAL_USD || '',
    amount: 100,
    currency: 'usd',
    name: 'Professional Annual (USD)',
    reportLimit: 1,
  },
  professionalAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_ANNUAL_GBP || '',
    amount: 79,
    currency: 'gbp',
    name: 'Professional Annual (GBP)',
    reportLimit: 1,
  },

  // ── Producer ───────────────────────────────────────────────────────────────
  producerMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_USD || '',
    amount: 100,
    currency: 'usd',
    name: 'Producer Monthly (USD)',
    reportLimit: 3,
  },
  producerMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_GBP || '',
    amount: 79,
    currency: 'gbp',
    name: 'Producer Monthly (GBP)',
    reportLimit: 3,
  },
  producerAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_ANNUAL_USD || '',
    amount: 100,
    currency: 'usd',
    name: 'Producer Annual (USD)',
    reportLimit: 3,
  },
  producerAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_ANNUAL_GBP || '',
    amount: 79,
    currency: 'gbp',
    name: 'Producer Annual (GBP)',
    reportLimit: 3,
  },

  // ── Studio ─────────────────────────────────────────────────────────────────
  studioMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_USD || '',
    amount: 100,
    currency: 'usd',
    name: 'Studio Monthly (USD)',
    reportLimit: 10,
  },
  studioMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_GBP || '',
    amount: 79,
    currency: 'gbp',
    name: 'Studio Monthly (GBP)',
    reportLimit: 10,
  },
  studioAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_ANNUAL_USD || '',
    amount: 100,
    currency: 'usd',
    name: 'Studio Annual (USD)',
    reportLimit: 10,
  },
  studioAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_ANNUAL_GBP || '',
    amount: 79,
    currency: 'gbp',
    name: 'Studio Annual (GBP)',
    reportLimit: 10,
  },
};

export async function redirectToCheckout(checkoutUrl: string) {
  if (!checkoutUrl) {
    throw new Error('No checkout URL provided');
  }
  window.location.href = checkoutUrl;
}

export async function createCreditCheckout(
  priceId: string,
): Promise<{ sessionId: string; url?: string; error?: string }> {
  try {
    const data = await apiClient.post<{ session_id: string; url: string }>(
      '/api/payments/credit-checkout',
      { price_id: priceId },
      { auth: true }
    );
    return { sessionId: data.session_id, url: data.url };
  } catch (error) {
    return { sessionId: '', error: error instanceof Error ? error.message : 'Failed to create checkout session' };
  }
}

export async function createSubscriptionCheckout(
  priceId: string,
  _userEmail: string,
  _userId: string,
  planType: string = 'professional'
): Promise<{ sessionId: string; url?: string; error?: string }> {
  try {
    const data = await apiClient.post<{ session_id: string; url: string }>(
      '/api/payments/subscription-checkout',
      { price_id: priceId, plan_type: planType },
      { auth: true }
    );
    return { sessionId: data.session_id, url: data.url };
  } catch (error) {
    return { sessionId: '', error: error instanceof Error ? error.message : 'Failed to create subscription' };
  }
}

export async function getCustomerPortalUrl(customerId: string): Promise<{ url: string; error?: string }> {
  try {
    const data = await apiClient.post<{ url: string }>(
      '/api/payments/customer-portal',
      { customer_id: customerId },
      { auth: true }
    );
    return { url: data.url };
  } catch (error) {
    return { url: '', error: error instanceof Error ? error.message : 'Failed to get portal URL' };
  }
}

export function detectUserCurrency(country?: string): 'usd' | 'gbp' {
  if (country === 'GB' || country === 'United Kingdom') {
    return 'gbp';
  }
  return 'usd';
}

export function formatPrice(amount: number, currency: string): string {
  const symbol = currency === 'gbp' ? '£' : '$';
  const formattedAmount = (amount / 100).toFixed(2);
  return `${symbol}${formattedAmount}`;
}
