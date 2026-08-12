import { describe, it, expect } from 'vitest';
import { discountedPrice, formatPrice, type Promotion } from '../usePromotion';

/**
 * The pricing page shows a struck-through list price beside a discounted one. The
 * discount a customer is actually charged comes from a Stripe coupon, so this maths
 * exists only to describe that coupon — never to create the impression of one.
 */

// The launch offer covers the individual-side subscription plans and nothing else.
const COVERED = ['professional', 'producer'];

const promo = (percentOff: number, plans = COVERED): Promotion => ({
  active: true, percentOff, label: `${percentOff}% off`, plans,
});
const none: Promotion = { active: false, percentOff: 0, label: '', plans: [] };

describe('discountedPrice', () => {
  it('applies the advertised percentage to the covered plans', () => {
    // The exact amounts Stripe charges under the 49% launch coupon. Rounding any
    // of them to a whole unit would quote a price nobody is billed.
    expect(discountedPrice(61, promo(49), 'professional')).toBe(31.11);
    expect(discountedPrice(149, promo(49), 'producer')).toBe(75.99);
  });

  it('shows no saving on a plan the coupon does not cover', () => {
    // Studio is a business plan and sits outside the individual-plan offer. The
    // one-off report and the Business Intelligence packages were never in it.
    // Striking any of their prices through would advertise a saving the checkout
    // does not give.
    expect(discountedPrice(299, promo(49), 'studio')).toBeNull();
    expect(discountedPrice(40, promo(49), 'single')).toBeNull();
    expect(discountedPrice(40, promo(49), 'credit')).toBeNull();
    expect(discountedPrice(300, promo(49), 'b2b')).toBeNull();
  });

  it('shows no saving when the caller cannot name the plan', () => {
    // The Single Report card has no plan key, because a one-off purchase is not a
    // plan. While an absent key skipped the scope check, that card was struck
    // through at the subscription discount and quoted $22 — but the credit
    // checkout sends no coupon, so Stripe charged the full $40. An unnameable
    // plan is not a covered plan.
    expect(discountedPrice(40, promo(49))).toBeNull();
    expect(discountedPrice(40, promo(49), undefined)).toBeNull();
  });

  it('returns null when no promotion is running, so the list price stands alone', () => {
    expect(discountedPrice(61, none, 'professional')).toBeNull();
  });

  it('returns null for a free plan rather than a discount of nothing', () => {
    expect(discountedPrice(0, promo(49), 'professional')).toBeNull();
  });

  it('never produces a discounted price at or above the list price', () => {
    for (const list of [61, 149]) {
      const cut = discountedPrice(list, promo(49), 'professional');
      expect(cut).not.toBeNull();
      expect(cut as number).toBeLessThan(list);
      expect(cut as number).toBeGreaterThan(0);
    }
  });

  it('resolves to whole cents, never a fraction of one', () => {
    // 45% of £49 is £26.95 exactly; floating point makes it 26.949999999999996
    // unless the result is quantised, and a price is not allowed to render as
    // £26.949999999999996.
    const cut = discountedPrice(49, promo(45), 'professional') as number;
    expect(Math.round(cut * 100)).toBe(cut * 100);
  });
});

describe('formatPrice', () => {
  it('keeps both cents when a price has them', () => {
    expect(formatPrice(33.55)).toBe('33.55');
    expect(formatPrice(36.6)).toBe('36.60');
  });

  it('leaves a whole price whole rather than padding it', () => {
    expect(formatPrice(61)).toBe('61');
    expect(formatPrice(299)).toBe('299');
  });
});
