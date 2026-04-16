/**
 * Stripe Payment Service (backend routed)
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
  // Legacy one-time prices — kept for backwards compat, no longer used in UI
  singleReportUSD: {
    priceId: 'price_1Sx84yLcLlewla5EUHVXBQY',
    amount: 7100,
    currency: 'usd',
    name: 'Single Script Report (USD)',
  },
  singleReportGBP: {
    priceId: 'price_1Sx5T8LcLlewla5EsQOLFBoy',
    amount: 5700,
    currency: 'gbp',
    name: 'Single Script Report (GBP)',
  },
  // Professional monthly subscription
  professionalMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_USD || '',
    amount: 6100,
    currency: 'usd',
    name: 'Professional Monthly (USD)',
    reportLimit: 3,
  },
  professionalMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_GBP || '',
    amount: 4900,
    currency: 'gbp',
    name: 'Professional Monthly (GBP)',
    reportLimit: 3,
  },
  // Studio monthly subscription
  studioMonthlyUSD: {
    priceId: 'price_1Sx8AfLcLlewla5Exif5R15n',
    amount: 29900,
    currency: 'usd',
    name: 'Studio Monthly (USD)',
    reportLimit: -1,
  },
  studioMonthlyGBP: {
    priceId: 'price_1Sx8CpLcLlewla5E42HQTVmg',
    amount: 23900,
    currency: 'gbp',
    name: 'Studio Monthly (GBP)',
    reportLimit: -1,
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
      {
        price_id: priceId,
        metadata,
      },
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

export async function cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await apiClient.post('/api/payments/cancel-subscription', { subscription_id: subscriptionId }, { auth: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to cancel subscription' };
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
  cancelSubscription,
  updatePaymentMethod,
  getCustomerPortalUrl,
  detectUserCurrency,
  getPriceForCurrency,
  formatPrice,
  getPlanNameFromPriceId,
  STRIPE_PRICES,
};
