import { describe, expect, it } from 'vitest';

import { TOOLTIP_TEXTS } from '../InfoTip';

describe('TOOLTIP_TEXTS', () => {
  it('contains public scoring-dimension explanations', () => {
    expect(TOOLTIP_TEXTS.incentiveStrength).toContain('verified incentive database');
    expect(TOOLTIP_TEXTS.incentiveReliability).toContain('bankable');
    expect(TOOLTIP_TEXTS.costEfficiency).toContain('curated Cost Efficiency rating');
    expect(TOOLTIP_TEXTS.currencyAdvantage).toContain('budget currency');
    expect(TOOLTIP_TEXTS.crewDepth).toContain('Established, Growing, or Emerging');
    expect(TOOLTIP_TEXTS.infrastructure).toContain('physical production ecosystem');
  });

  it('does not keep deprecated reliability copy or GBP-specific currency wording', () => {
    const tooltipMap = TOOLTIP_TEXTS as Record<string, string>;

    expect(tooltipMap.reliabilityScore).toBeUndefined();
    expect(tooltipMap.investorSafety).toBeUndefined();
    expect(TOOLTIP_TEXTS.currencyAdvantage).not.toContain('Because your budget is in GBP');
    expect(TOOLTIP_TEXTS.productionPriority).toContain('Incentive Reliability 15%');
  });
});
