import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';

export interface Promotion {
  active: boolean;
  percentOff: number;
  /** How many months the coupon repeats for, from the server. 0 means unset, and
   *  the surfaces then say nothing about the term rather than inventing one. */
  durationMonths: number;
  label: string;
  /** Plan keys the Stripe coupon is scoped to. A plan outside this list is charged
   *  in full, so it must not be shown a saving. */
  plans: string[];
}

const NO_PROMOTION: Promotion = { active: false, percentOff: 0, durationMonths: 0, label: '', plans: [] };

/**
 * The promotion the checkout will actually apply.
 *
 * Deliberately not a constant in this file. The amount a customer is charged comes
 * from Stripe, so a percentage hardcoded here would keep advertising a discount
 * after the coupon expired or before it was ever created — showing one price and
 * billing another. The API reports what the Stripe coupon is, and the site says
 * nothing about a discount unless that coupon exists.
 *
 * Fails closed: any error means no promotion is shown. Quietly charging list price
 * is recoverable; advertising a discount that will not be applied is not.
 */
export function usePromotion(): Promotion {
  const [promotion, setPromotion] = useState<Promotion>(NO_PROMOTION);

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<Promotion>('/api/payments/promotion')
      .then((data) => {
        if (cancelled) return;
        const percent = Number(data?.percentOff) || 0;
        if (data?.active && percent > 0 && percent < 100) {
          setPromotion({
            active: true,
            percentOff: percent,
            durationMonths: Math.max(0, Number(data?.durationMonths) || 0),
            label: data.label || '',
            plans: Array.isArray(data.plans) ? data.plans.map(String) : [],
          });
        }
      })
      .catch(() => {
        /* No promotion shown. See the note above on failing closed. */
      });
    return () => { cancelled = true; };
  }, []);

  return promotion;
}

/**
 * List price with the promotion applied, to the cent.
 *
 * Deliberately NOT rounded to whole units. Stripe applies the percentage to the
 * price in minor units and charges the exact result: 40% off $61 is $36.60, and a
 * page that rounded that to $37 would be quoting a price nobody is charged — the
 * same divergence, only smaller, that this file exists to prevent. Whole-unit
 * rounding was fine while it was only ever describing an approximate saving; it
 * stopped being fine once the figure sits beside a struck-through list price and
 * reads as the amount you will pay.
 *
 * Returns null when there is no promotion to apply, so a caller renders the list
 * price alone rather than a discount of zero.
 *
 * `planKey` is required, and is checked against the coupon's own scope as
 * configured on the server. It used to be optional, and an absent key skipped the
 * scope check entirely — which is how the one-off Single Report came to advertise
 * a saving. That card carries no plan key because it is not a plan, so it fell
 * through the guard and was struck through at the subscription discount, while
 * `create_credit_checkout_session` on the server sends no coupon at all and Stripe
 * charged the full price. A caller that cannot say which plan it is holding cannot
 * know the coupon covers it, so the absent case now means no discount.
 */
export function discountedPrice(
  listPrice: number,
  promotion: Promotion,
  planKey?: string,
): number | null {
  if (!promotion.active || !listPrice) return null;
  if (!planKey) return null;
  if (promotion.plans.length && !promotion.plans.includes(planKey.toLowerCase())) {
    return null;
  }
  return Math.round(listPrice * (1 - promotion.percentOff / 100) * 100) / 100;
}

/**
 * A price as the pricing surfaces render it: whole units stay whole, and a figure
 * with cents keeps both of them ($36.60, never $36.6).
 */
export function formatPrice(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
