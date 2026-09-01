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

// This mapper used to drop the co-production fields entirely: neither
// coProductionStructure nor coProductionOpportunities was assigned anywhere in
// its return value, so a report reaching ReportViewer through this fallback
// path (rather than the direct-spread path) rendered no co-production section
// at all — chosen structure or not, regardless of what the backend computed.
describe('mapReportToAnalysis: co-production fields are carried through', () => {
  it('passes through a chosen co-production structure', () => {
    const report = bareReport();
    const structure = { mode: 'coproduction', partners: [], partnerCount: 2 };
    (report.report_data as any).coProductionStructure = structure;
    expect(mapReportToAnalysis(report, metadata).coProductionStructure).toEqual(structure);
  });

  it('passes through undecided-mode co-production opportunities', () => {
    const report = bareReport();
    const opportunities = [{ territory: 'France', program: 'CNC Tax Rebate' }];
    (report.report_data as any).coProductionOpportunities = opportunities;
    expect(mapReportToAnalysis(report, metadata).coProductionOpportunities).toEqual(opportunities);
  });

  it('defaults both to null rather than undefined when absent', () => {
    const mapped = mapReportToAnalysis(bareReport(), metadata);
    expect(mapped.coProductionStructure).toBeNull();
    expect(mapped.coProductionOpportunities).toBeNull();
  });
});

// Same class of bug: scoringMethodology, scriptOriginCallout, territoryDeepDives
// and financialReadiness are all computed by the backend and rendered in the
// PDF, but were never assigned by this mapper — so a report reaching
// ReportViewer through this fallback path showed none of them, regardless of
// what the backend computed.
describe('mapReportToAnalysis: PDF-only sections are carried through', () => {
  it('passes through scoringMethodology', () => {
    const report = bareReport();
    const methodology = { overview: 'x', dimensions: [], weightingNote: 'y', colorKey: { green: 'a', gold: 'b', red: 'c' } };
    (report.report_data as any).scoringMethodology = methodology;
    expect(mapReportToAnalysis(report, metadata).scoringMethodology).toEqual(methodology);
  });

  it('passes through scriptOriginCallout', () => {
    const report = bareReport();
    const callout = { territory: 'Nigeria', hasIncentiveProgramme: false };
    (report.report_data as any).scriptOriginCallout = callout;
    expect(mapReportToAnalysis(report, metadata).scriptOriginCallout).toEqual(callout);
  });

  it('passes through territoryDeepDives', () => {
    const report = bareReport();
    const dives = [{ name: 'South Africa', country: 'ZA', score: 41 }];
    (report.report_data as any).territoryDeepDives = dives;
    expect(mapReportToAnalysis(report, metadata).territoryDeepDives).toEqual(dives);
  });

  it('passes through financialReadiness', () => {
    const report = bareReport();
    const readiness = { verdict: 'READY', score: 88, components: [], flags: [] };
    (report.report_data as any).financialReadiness = readiness;
    expect(mapReportToAnalysis(report, metadata).financialReadiness).toEqual(readiness);
  });

  it('defaults all four to null rather than undefined when absent', () => {
    const mapped = mapReportToAnalysis(bareReport(), metadata);
    expect(mapped.scoringMethodology).toBeNull();
    expect(mapped.scriptOriginCallout).toBeNull();
    expect(mapped.territoryDeepDives).toBeNull();
    expect(mapped.financialReadiness).toBeNull();
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
