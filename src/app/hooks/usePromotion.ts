import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';

export interface Promotion {
  active: boolean;
  percentOff: number;
  label: string;
}

const NO_PROMOTION: Promotion = { active: false, percentOff: 0, label: '' };

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
          setPromotion({ active: true, percentOff: percent, label: data.label || '' });
        }
      })
      .catch(() => {
        /* No promotion shown. See the note above on failing closed. */
      });
    return () => { cancelled = true; };
  }, []);

  return promotion;
}

/** List price with the promotion applied, rounded to whole units like the rest of
 *  the pricing surfaces. Returns null when there is no promotion to apply, so a
 *  caller renders the list price alone rather than a discount of zero. */
export function discountedPrice(listPrice: number, promotion: Promotion): number | null {
  if (!promotion.active || !listPrice) return null;
  return Math.round(listPrice * (1 - promotion.percentOff / 100));
}
