/**
 * The mapper maps. It does not compute, and it does not fill gaps with numbers.
 *
 * FIX-01: PDF and platform were deriving values independently. The backend
 * computes one canonical report object — six dimension scores, weighted total,
 * incentive strength, waterfall, readiness verdict, comparables, eligibility —
 * and every surface is supposed to render it. `mapReportToAnalysis`, the
 * fallback path for legacy report payloads, was a second derivation instead:
 *
 *   incentiveStrength: clampScore(incentive ? 80 : 45)   // from a boolean
 *   currencyAdvantage: clampScore(65)                    // a constant
 *   costEfficiency:    Number(x ?? 60)                   // a default
 *   crewDepth:         locationMatch?.score || 60        // wrong source
 *   infrastructure:    locationMatch?.score || 65        // the SAME source
 *   bestMonths:        ['Apr', 'May', 'Sep', 'Oct']      // for every territory
 *   weatherRisk:       derived from the overall score    // not from weather
 *
 * Those defaults are not neutral: 60/65/80 sit above the midpoint, so a
 * territory the backend scored conservatively (or declined to score) came out
 * of this mapper looking better than the data supported — on the platform only.
 *
 * These tests exist to fail if any such default comes back.
 */
import { describe, expect, it } from 'vitest';

import { mapReportToAnalysis, optionalScore } from '../reportMapping';

const metadata: any = {
  title: 'EJE DRAFT 7',
  genre: ['Horror'],
  budgetAmount: 1_000_000,
  budgetCurrency: 'ZAR',
  format: 'Short',
};

/** A legacy payload carrying a territory and nothing else about it. */
function bareReport() {
  return {
    id: 'r1',
    report_data: {
      territoryAnalysis: [
        { territory: 'South Africa', country: 'ZA', overallScore: 41 },
      ],
    },
  };
}

describe('mapReportToAnalysis: no invented dimension scores', () => {
  const loc = () => mapReportToAnalysis(bareReport(), metadata).locationRankings[0];

  it('reports an absent incentive strength as null, not 45 or 80', () => {
    expect(loc().incentiveStrength).toBeNull();
  });

  it('reports an absent currency advantage as null, not the constant 65', () => {
    expect(loc().currencyAdvantage).toBeNull();
  });

  it('reports an absent cost efficiency as null, not the default 60', () => {
    expect(loc().costEfficiency).toBeNull();
  });

  it('reports absent crew depth and infrastructure as null', () => {
    expect(loc().crewDepth).toBeNull();
    expect(loc().infrastructure).toBeNull();
  });

  it('never reports crew depth and infrastructure as the same borrowed number', () => {
    const report = bareReport();
    report.report_data.territoryAnalysis[0] = {
      ...report.report_data.territoryAnalysis[0],
      locationMatch: { score: 72 },
    } as any;
    const l = mapReportToAnalysis(report, metadata).locationRankings[0];
    // locationMatch.score is not a crew or infrastructure measurement; reading it
    // as both is how one number was printed under two different labels.
    expect(l.crewDepth).toBeNull();
    expect(l.infrastructure).toBeNull();
  });
});

describe('mapReportToAnalysis: reads the backend values when present', () => {
  it('passes computed dimensions straight through', () => {
    const report = bareReport();
    report.report_data.territoryAnalysis[0] = {
      territory: 'United Kingdom',
      country: 'GB',
      overallScore: 62,
      costEfficiencyScore: 50,
      crewDepthScore: 95,
      infrastructureScore: 90,
      incentiveStrength: 61,
      currencyAdvantage: 31,
      incentiveReliability: 90,
    } as any;
    const l = mapReportToAnalysis(report, metadata).locationRankings[0];
    expect(l).toMatchObject({
      costEfficiency: 50, crewDepth: 95, infrastructure: 90,
      incentiveStrength: 61, currencyAdvantage: 31, incentiveReliability: 90,
    });
  });

  it('keeps a genuine zero distinct from an absent score', () => {
    const report = bareReport();
    (report.report_data.territoryAnalysis[0] as any).incentiveStrength = 0;
    const l = mapReportToAnalysis(report, metadata).locationRankings[0];
    expect(l.incentiveStrength).toBe(0);
    expect(l.incentiveStrength).not.toBeNull();
  });
});

describe('mapReportToAnalysis: weather is read, not manufactured', () => {
  it('emits nothing when the report carries no weather section', () => {
    expect(mapReportToAnalysis(bareReport(), metadata).weatherLogistics).toEqual([]);
  });

  it('never invents the same four best months for every territory', () => {
    const report = bareReport();
    report.report_data.territoryAnalysis.push(
      { territory: 'United Kingdom', country: 'GB', overallScore: 62 } as any,
    );
    const weather = mapReportToAnalysis(report, metadata).weatherLogistics;
    expect(weather.some((w) => w.bestMonths.join() === 'Apr,May,Sep,Oct')).toBe(false);
  });

  it('passes the backend weather record through unchanged', () => {
    const report = bareReport();
    (report.report_data as any).weatherLogistics = [
      { territory: 'South Africa', bestMonths: ['Oct', 'Nov'], weatherRisk: 'Medium' },
    ];
    const [w] = mapReportToAnalysis(report, metadata).weatherLogistics;
    expect(w.bestMonths).toEqual(['Oct', 'Nov']);
    expect(w.weatherRisk).toBe('Medium');
  });
});

describe('mapReportToAnalysis: comparables count matches the PDF', () => {
  it('reads the builder key `comparables`', () => {
    const report = bareReport();
    (report.report_data as any).comparables = [{ title: 'Aftersun' }, { title: 'Rocks' }];
    expect(mapReportToAnalysis(report, metadata).comparables).toHaveLength(2);
  });

  it('still reads the legacy key when that is what the payload carries', () => {
    const report = bareReport();
    (report.report_data as any).comparableProductions = [{ title: 'Blue Jean' }];
    expect(mapReportToAnalysis(report, metadata).comparables).toHaveLength(1);
  });
});

describe('optionalScore', () => {
  it.each([null, undefined, '', 'abc', NaN])('treats %s as unscored', (v) => {
    expect(optionalScore(v)).toBeNull();
  });

  it('keeps zero', () => {
    expect(optionalScore(0)).toBe(0);
  });

  it('clamps into 0..100', () => {
    expect(optionalScore(140)).toBe(100);
    expect(optionalScore(-5)).toBe(0);
  });
});
