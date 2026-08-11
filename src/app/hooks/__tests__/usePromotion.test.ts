import { describe, it, expect } from 'vitest';
import { discountedPrice, type Promotion } from '../usePromotion';

/**
 * The pricing page shows a struck-through list price beside a discounted one. The
 * discount a customer is actually charged comes from a Stripe coupon, so this maths
 * exists only to describe that coupon — never to create the impression of one.
 */

// The live coupon covers the three subscription plans and nothing else.
const COVERED = ['professional', 'producer', 'studio'];

const promo = (percentOff: number, plans = COVERED): Promotion => ({
  active: true, percentOff, label: `${percentOff}% off`, plans,
});
const none: Promotion = { active: false, percentOff: 0, label: '', plans: [] };

describe('discountedPrice', () => {
  it('applies the advertised percentage to the covered plans', () => {
    expect(discountedPrice(61, promo(45), 'professional')).toBe(34);
    expect(discountedPrice(149, promo(45), 'producer')).toBe(82);
    expect(discountedPrice(299, promo(45), 'studio')).toBe(164);
  });

  it('shows no saving on a plan the coupon does not cover', () => {
    // The one-off report sits outside the Stripe coupon's product scope. Striking
    // its price through would advertise a discount the checkout would not give —
    // and Stripe rejects a session carrying a coupon for the wrong product, so the
    // purchase would fail rather than merely cost more.
    expect(discountedPrice(40, promo(45), 'single')).toBeNull();
    expect(discountedPrice(40, promo(45), 'credit')).toBeNull();
  });

  it('returns null when no promotion is running, so the list price stands alone', () => {
    expect(discountedPrice(61, none, 'professional')).toBeNull();
  });

  it('returns null for a free plan rather than a discount of nothing', () => {
    expect(discountedPrice(0, promo(45), 'professional')).toBeNull();
  });

  it('never produces a discounted price at or above the list price', () => {
    for (const list of [61, 149, 299]) {
      const cut = discountedPrice(list, promo(45), 'professional');
      expect(cut).not.toBeNull();
      expect(cut as number).toBeLessThan(list);
      expect(cut as number).toBeGreaterThan(0);
    }
  });

  it('rounds to whole units, matching how every other price on the page is set', () => {
    expect(discountedPrice(61, promo(45), 'professional')).toBe(Math.round(61 * 0.55));
  });
});
