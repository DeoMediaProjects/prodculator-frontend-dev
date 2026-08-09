/**
 * Stripe Payment Service (backend routed)
 *
 * All card data flows through Stripe Checkout — we never handle raw card numbers.
 * This keeps the integration at PCI SAQ-A compliance level.
 */

import { apiClient } from './api';

/**
 * Canonical B2C price schedule — the ONE place these numbers are written.
 *
 * Must stay equal to the amounts on the Stripe prices behind
 * VITE_STRIPE_PRICE_* , because that is what the customer is actually charged.
 * They previously disagreed: every plan displayed $1.00/£0.79 (a leftover from
 * the test-billing period) while checkout used the real price IDs, so the
 * pricing page advertised $1/mo and Stripe billed $61/mo.
 *
 * Major units (whole currency), matching how the pricing cards render.
 * `annual*` is the PER-MONTH equivalent when billed annually; `annualTotal*` is
 * the amount actually charged once a year, and must equal the Stripe price.
 *
 * Verified against live Stripe on 4 Aug 2026 — 14/14 prices matched.
 */
export const PLAN_PRICING = {
  singleReport: { monthlyUSD: 40, monthlyGBP: 35 },
  professional: {
    monthlyUSD: 61, monthlyGBP: 49,
    annualUSD: 49, annualGBP: 39,
    annualTotalUSD: 588, annualTotalGBP: 468,
  },
  producer: {
    monthlyUSD: 149, monthlyGBP: 119,
    annualUSD: 119, annualGBP: 95,
    annualTotalUSD: 1428, annualTotalGBP: 1140,
  },
  studio: {
    monthlyUSD: 299, monthlyGBP: 239,
    annualUSD: 239, annualGBP: 199,
    annualTotalUSD: 2868, annualTotalGBP: 2388,
  },
} as const;

/** Business Intelligence packages, priced in GBP only.
 *
 *  The catalogue's own prices live in the backend (app/modules/b2b/service.py):
 *  Crew & Casting £300/mo, Camera & Equipment £600/mo, Production Services
 *  £750/mo. This constant carries only the floor, for the "from" figure the
 *  marketing surfaces quote, and exists so that figure is written once. The nav
 *  menu and the pricing page previously each hardcoded "from $2/mo", a
 *  placeholder from before the packages were priced.
 *
 *  No USD equivalent: these products carry no USD price, and converting one here
 *  would invent a figure nobody can be charged. */
export const BI_PRICING = {
  /** Lowest package price, in GBP per month. Crew & Casting. */
  lowestMonthlyGBP: 300,
} as const;

/** Major units → minor units, for the reference `amount` fields below. */
const minor = (major: number) => Math.round(major * 100);

// `amount` mirrors PLAN_PRICING for reference/debugging only — the charged
// amount always comes from the Stripe price ID, never from this file.
export const STRIPE_PRICES = {
  // ── Pay-per-report (one-time) ──────────────────────────────────────────────
  singleReportUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_SINGLE_USD || '',
    amount: minor(PLAN_PRICING.singleReport.monthlyUSD),
    currency: 'usd',
    name: 'Single Script Report (USD)',
  },
  singleReportGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_SINGLE_GBP || '',
    amount: minor(PLAN_PRICING.singleReport.monthlyGBP),
    currency: 'gbp',
    name: 'Single Script Report (GBP)',
  },

  // ── Professional ───────────────────────────────────────────────────────────
  professionalMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_USD || '',
    amount: minor(PLAN_PRICING.professional.monthlyUSD),
    currency: 'usd',
    name: 'Professional Monthly (USD)',
    reportLimit: 1,
  },
  professionalMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_GBP || '',
    amount: minor(PLAN_PRICING.professional.monthlyGBP),
    currency: 'gbp',
    name: 'Professional Monthly (GBP)',
    reportLimit: 1,
  },
  professionalAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_ANNUAL_USD || '',
    amount: minor(PLAN_PRICING.professional.annualTotalUSD),
    currency: 'usd',
    name: 'Professional Annual (USD)',
    reportLimit: 1,
  },
  professionalAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PROFESSIONAL_ANNUAL_GBP || '',
    amount: minor(PLAN_PRICING.professional.annualTotalGBP),
    currency: 'gbp',
    name: 'Professional Annual (GBP)',
    reportLimit: 1,
  },

  // ── Producer ───────────────────────────────────────────────────────────────
  producerMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_USD || '',
    amount: minor(PLAN_PRICING.producer.monthlyUSD),
    currency: 'usd',
    name: 'Producer Monthly (USD)',
    reportLimit: 3,
  },
  producerMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_GBP || '',
    amount: minor(PLAN_PRICING.producer.monthlyGBP),
    currency: 'gbp',
    name: 'Producer Monthly (GBP)',
    reportLimit: 3,
  },
  producerAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_ANNUAL_USD || '',
    amount: minor(PLAN_PRICING.producer.annualTotalUSD),
    currency: 'usd',
    name: 'Producer Annual (USD)',
    reportLimit: 3,
  },
  producerAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_PRODUCER_ANNUAL_GBP || '',
    amount: minor(PLAN_PRICING.producer.annualTotalGBP),
    currency: 'gbp',
    name: 'Producer Annual (GBP)',
    reportLimit: 3,
  },

  // ── Studio ─────────────────────────────────────────────────────────────────
  studioMonthlyUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_USD || '',
    amount: minor(PLAN_PRICING.studio.monthlyUSD),
    currency: 'usd',
    name: 'Studio Monthly (USD)',
    reportLimit: 10,
  },
  studioMonthlyGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_GBP || '',
    amount: minor(PLAN_PRICING.studio.monthlyGBP),
    currency: 'gbp',
    name: 'Studio Monthly (GBP)',
    reportLimit: 10,
  },
  studioAnnualUSD: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_ANNUAL_USD || '',
    amount: minor(PLAN_PRICING.studio.annualTotalUSD),
    currency: 'usd',
    name: 'Studio Annual (USD)',
    reportLimit: 10,
  },
  studioAnnualGBP: {
    priceId: import.meta.env.VITE_STRIPE_PRICE_STUDIO_ANNUAL_GBP || '',
    amount: minor(PLAN_PRICING.studio.annualTotalGBP),
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
  planType: string = 'professional',
  currency: string = 'usd',
  billingCycle: string = 'monthly'
): Promise<{ sessionId: string; url?: string; error?: string }> {
  try {
    // Send plan/currency/cycle alongside price_id so the backend can resolve
    // the Stripe price from its own config when the build-time price_id is
    // empty (VITE_STRIPE_PRICE_* not baked in). The backend is the source of
    // truth for prices.
    const data = await apiClient.post<{ session_id: string; url: string }>(
      '/api/payments/subscription-checkout',
      { price_id: priceId, plan_type: planType, currency, billing_cycle: billingCycle },
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
