/**
 * Stripe Payment Service (backend routed)
 *
 * All card data flows through Stripe Checkout — we never handle raw card numbers.
 * This keeps the integration at PCI SAQ-A compliance level.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';
import { apiClient } from './api';

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

let stripePromise: Promise<Stripe | null> | null = null;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

export const STRIPE_PRICES = {
  // ── Pay-per-report (one-time) ──────────────────────────────────────────────
  singleReportUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_SINGLE_USD || '',
    amount: 4000,
    currency: 'usd',
    name: 'Single Script Report (USD)',
  },
  singleReportGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_SINGLE_GBP || '',
    amount: 3500,
    currency: 'gbp',
    name: 'Single Script Report (GBP)',
  },

  // ── Professional ───────────────────────────────────────────────────────────
  professionalMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_USD || '',
    amount: 6100,
    currency: 'usd',
    name: 'Professional Monthly (USD)',
    reportLimit: 1,
  },
  professionalMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_GBP || '',
    amount: 4900,
    currency: 'gbp',
    name: 'Professional Monthly (GBP)',
    reportLimit: 1,
  },
  professionalAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_ANNUAL_USD || '',
    amount: 4900,  // $49/mo billed annually = $588/yr (~20% off $61/mo)
    currency: 'usd',
    name: 'Professional Annual (USD)',
    reportLimit: 1,
  },
  professionalAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_ANNUAL_GBP || '',
    amount: 3900,  // £39/mo billed annually = £468/yr
    currency: 'gbp',
    name: 'Professional Annual (GBP)',
    reportLimit: 1,
  },

  // ── Producer ───────────────────────────────────────────────────────────────
  producerMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_USD || '',
    amount: 14900,
    currency: 'usd',
    name: 'Producer Monthly (USD)',
    reportLimit: 3,
  },
  producerMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_GBP || '',
    amount: 11900,
    currency: 'gbp',
    name: 'Producer Monthly (GBP)',
    reportLimit: 3,
  },
  producerAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_ANNUAL_USD || '',
    amount: 11900,  // $119/mo billed annually = $1,428/yr (~20% off $149/mo)
    currency: 'usd',
    name: 'Producer Annual (USD)',
    reportLimit: 3,
  },
  producerAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_ANNUAL_GBP || '',
    amount: 9500,  // £95/mo billed annually = £1,140/yr
    currency: 'gbp',
    name: 'Producer Annual (GBP)',
    reportLimit: 3,
  },

  // ── Studio ─────────────────────────────────────────────────────────────────
  studioMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_USD || '',
    amount: 29900,
    currency: 'usd',
    name: 'Studio Monthly (USD)',
    reportLimit: 10,
  },
  studioMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_GBP || '',
    amount: 23900,
    currency: 'gbp',
    name: 'Studio Monthly (GBP)',
    reportLimit: 10,
  },
  studioAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_ANNUAL_USD || '',
    amount: 23900,  // $239/mo billed annually = $2,868/yr (~20% off $299/mo)
    currency: 'usd',
    name: 'Studio Annual (USD)',
    reportLimit: 10,
  },
  studioAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_ANNUAL_GBP || '',
    amount: 19900,  // £199/mo billed annually = £2,388/yr
    currency: 'gbp',
    name: 'Studio Annual (GBP)',
    reportLimit: 10,
  },
};

export async function createCheckoutSession(
  priceId: string,
  _userEmail: string,
  metadata?: Record<string, string>
): Promise<{ sessionId: string; url?: string; error?: string }> {
  try {
    const data = await apiClient.post<{ session_id: string; url: string }>(
      '/api/payments/checkout',
      { price_id: priceId, metadata },
      { auth: true }
    );
    return { sessionId: data.session_id, url: data.url };
  } catch (error) {
    return { sessionId: '', error: error instanceof Error ? error.message : 'Failed to create checkout session' };
  }
}

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

export async function updatePaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.post(
      '/api/payments/update-payment-method',
      { customer_id: customerId, payment_method_id: paymentMethodId },
      { auth: true }
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to update payment method' };
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

export function getPriceForCurrency(
  planType: 'singleReport' | 'proMonthly' | 'producerAnnual' | 'studioMonthly',
  currency: 'usd' | 'gbp'
) {
  const key = `${planType}${currency.toUpperCase()}` as keyof typeof STRIPE_PRICES;
  return STRIPE_PRICES[key];
}

export function formatPrice(amount: number, currency: string): string {
  const symbol = currency === 'gbp' ? '£' : '$';
  const formattedAmount = (amount / 100).toFixed(2);
  return `${symbol}${formattedAmount}`;
}

export function getPlanNameFromPriceId(priceId: string): string {
  const entry = Object.entries(STRIPE_PRICES).find(([_, config]) => config.priceId === priceId);
  return entry ? entry[1].name : 'Unknown Plan';
}

export default {
  getStripe,
  createCheckoutSession,
  redirectToCheckout,
  createSubscriptionCheckout,
  updatePaymentMethod,
  getCustomerPortalUrl,
  detectUserCurrency,
  getPriceForCurrency,
  formatPrice,
  getPlanNameFromPriceId,
  STRIPE_PRICES,
};
