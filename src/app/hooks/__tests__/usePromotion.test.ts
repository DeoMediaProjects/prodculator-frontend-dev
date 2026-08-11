import { describe, it, expect } from 'vitest';
import { discountedPrice, type Promotion } from '../usePromotion';

/**
 * The pricing page shows a struck-through list price beside a discounted one. The
 * discount a customer is actually charged comes from a Stripe coupon, so this maths
 * exists only to describe that coupon — never to create the impression of one.
 */

const promo = (percentOff: number): Promotion => ({
  active: true, percentOff, label: `${percentOff}% off`,
});
const none: Promotion = { active: false, percentOff: 0, label: '' };

describe('discountedPrice', () => {
  it('applies the advertised percentage to the real plan prices', () => {
    // The four paid B2C plans at their current list prices.
    expect(discountedPrice(40, promo(45))).toBe(22);   // Single Report
    expect(discountedPrice(61, promo(45))).toBe(34);   // Professional
    expect(discountedPrice(149, promo(45))).toBe(82);  // Producer
    expect(discountedPrice(299, promo(45))).toBe(164); // Studio
  });

  it('returns null when no promotion is running, so the list price stands alone', () => {
    expect(discountedPrice(61, none)).toBeNull();
  });

  it('returns null for a free plan rather than a discount of nothing', () => {
    expect(discountedPrice(0, promo(45))).toBeNull();
  });

  it('never produces a discounted price at or above the list price', () => {
    for (const list of [40, 61, 149, 299]) {
      const cut = discountedPrice(list, promo(45));
      expect(cut).not.toBeNull();
      expect(cut as number).toBeLessThan(list);
      expect(cut as number).toBeGreaterThan(0);
    }
  });

  it('rounds to whole units, matching how every other price on the page is set', () => {
    expect(discountedPrice(61, promo(45))).toBe(Math.round(61 * 0.55));
  });
});
