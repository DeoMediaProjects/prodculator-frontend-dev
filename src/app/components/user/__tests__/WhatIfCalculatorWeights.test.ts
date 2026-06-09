import { describe, expect, it } from 'vitest';

import { SCORE_WEIGHTS_INFO as PRIVATE_SCORE_WEIGHTS_INFO } from '../WhatIfCalculator';
import { SCORE_WEIGHTS_INFO as PUBLIC_SCORE_WEIGHTS_INFO } from '../PublicWhatIfCalculator';

const expectedWeights = {
  full: [
    ['Incentive Strength', '30%'],
    ['Incentive Reliability', '15%'],
    ['Cost Efficiency', '20%'],
    ['Currency Advantage', '15%'],
    ['Crew Depth', '10%'],
    ['Infrastructure', '10%'],
  ],
  incentive: [
    ['Incentive Strength', '45%'],
    ['Incentive Reliability', '15%'],
    ['Cost Efficiency', '15%'],
    ['Currency Advantage', '15%'],
    ['Crew Depth', '5%'],
    ['Infrastructure', '5%'],
  ],
  location: [
    ['Crew Depth', '25%'],
    ['Infrastructure', '20%'],
    ['Cost Efficiency', '20%'],
    ['Incentive Strength', '15%'],
    ['Incentive Reliability', '10%'],
    ['Currency Advantage', '10%'],
  ],
} as const;

function simplify(
  weights: typeof PRIVATE_SCORE_WEIGHTS_INFO,
): Record<keyof typeof expectedWeights, Array<[string, string]>> {
  return {
    full: weights.full.map((item) => [item.label, item.pct]),
    incentive: weights.incentive.map((item) => [item.label, item.pct]),
    location: weights.location.map((item) => [item.label, item.pct]),
  };
}

describe('What If calculator score weights', () => {
  it('uses the approved methodology in the authenticated calculator', () => {
    expect(simplify(PRIVATE_SCORE_WEIGHTS_INFO)).toEqual(expectedWeights);
  });

  it('uses the same approved methodology in the public calculator', () => {
    expect(simplify(PUBLIC_SCORE_WEIGHTS_INFO)).toEqual(expectedWeights);
  });

  it('does not expose Programme Reliability terminology', () => {
    const allLabels = [
      ...PRIVATE_SCORE_WEIGHTS_INFO.full,
      ...PRIVATE_SCORE_WEIGHTS_INFO.incentive,
      ...PRIVATE_SCORE_WEIGHTS_INFO.location,
      ...PUBLIC_SCORE_WEIGHTS_INFO.full,
      ...PUBLIC_SCORE_WEIGHTS_INFO.incentive,
      ...PUBLIC_SCORE_WEIGHTS_INFO.location,
    ].map((item) => item.label);

    expect(allLabels).not.toContain('Programme Reliability');
    expect(allLabels).toContain('Incentive Reliability');
  });
});
