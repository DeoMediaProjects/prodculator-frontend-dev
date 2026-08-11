import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';

export interface Promotion {
  active: boolean;
  percentOff: number;
  label: string;
  /** Plan keys the Stripe coupon is scoped to. A plan outside this list is charged
   *  in full, so it must not be shown a saving. */
  plans: string[];
}

const NO_PROMOTION: Promotion = { active: false, percentOff: 0, label: '', plans: [] };

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
 * List price with the promotion applied, rounded to whole units like the rest of
 * the pricing surfaces. Returns null when there is no promotion to apply, so a
 * caller renders the list price alone rather than a discount of zero.
 *
 * `planKey` is checked against the coupon's own scope. A Stripe coupon covers
 * specific products, and the one-off report sits outside this one — showing it a
 * struck-through price would advertise a saving the checkout would not give, which
 * is the exact divergence this whole path is built to prevent. Omit `planKey` only
 * for a plan known to be in scope.
 */
export function discountedPrice(
  listPrice: number,
  promotion: Promotion,
  planKey?: string,
): number | null {
  if (!promotion.active || !listPrice) return null;
  if (planKey && promotion.plans.length && !promotion.plans.includes(planKey.toLowerCase())) {
    return null;
  }
  return Math.round(listPrice * (1 - promotion.percentOff / 100));
}
