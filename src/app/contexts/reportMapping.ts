/**
 * Pure mapping from a stored report payload to the in-app ScriptAnalysis shape.
 *
 * Extracted from ScriptContext so it can be exercised without importing the app
 * (api client, auth, MUI). The separation is also the point of FIX-01: the
 * backend produces one canonical computed report object, and this file's only
 * job is to READ it. Nothing here may compute a score, a rate, a rebate or a
 * risk rating — if a value is absent from the payload it stays absent.
 */
import type {
  ComparableProduction,
  FundingOpportunity,
  IncentiveEstimate,
  LocationRanking,
  ScriptAnalysis,
  ScriptMetadata,
  WeatherLogistics,
} from './report.types';

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** A dimension score the payload may not carry.
 *
 *  Returns null when there is no number to read, rather than substituting one.
 *  The distinction it protects is the whole point of this mapper: null means the
 *  backend had no basis to score the dimension, 0 means it scored it and the
 *  answer was zero. A default — any default — erases that, and the defaults this
 *  file used to carry (60, 65, 80, 45) were high enough to lift a territory's
 *  weighted total well above what the data supported.
 */
export function optionalScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? clampScore(n) : null;
}

function complexityFromDays(days: number): 'Low' | 'Medium' | 'High' | 'Very High' {
  if (days >= 70) return 'Very High';
  if (days >= 45) return 'High';
  if (days >= 20) return 'Medium';
  return 'Low';
}

function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function buildReportRequestBody(
  metadata: ScriptMetadata,
  reportType: 'preview' | 'paid' | 'b2b'
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    script_title: metadata.title,
    report_type: reportType,
    genre: metadata.genre,
    budget_amount: metadata.budgetAmount,
    budget_currency: metadata.budgetCurrency,
    format: metadata.format,
    country: metadata.country,
    production_priority: metadata.productionPriority,
  };
  // Only sent if a caller still supplies it; the backend defaults to "open".
  if (metadata.locationStrategy) body.location_strategy = metadata.locationStrategy;
  if (metadata.stateProvince) body.state_province = metadata.stateProvince;
  if (metadata.territoriesConsidering?.length) body.territories_considering = metadata.territoriesConsidering;
  if (metadata.filmingStart) body.filming_start_date = metadata.filmingStart;
  if (metadata.filmingDuration) body.filming_duration = Number(metadata.filmingDuration);
  if (metadata.cameraEquipment?.length) body.camera_equipment = metadata.cameraEquipment;
  if (metadata.crewSize) body.crew_size = metadata.crewSize;
  if (metadata.principalCast) body.principal_cast = metadata.principalCast;
  if (metadata.supportingCast) body.supporting_cast = metadata.supportingCast;
  if (metadata.completionDate) body.completion_date = metadata.completionDate;
  if (metadata.mustFilmIn) body.must_film_in = metadata.mustFilmIn;
  if (metadata.coProductionInterest) body.co_production_interest = metadata.coProductionInterest;
  if (metadata.targetAudience?.length) body.target_audience = metadata.targetAudience;
  if (metadata.audienceSegments?.length) body.audience_segments = metadata.audienceSegments;
  if (metadata.audienceSkew) body.audience_skew = metadata.audienceSkew;
  if (metadata.representationGender) body.representation_gender = metadata.representationGender;
  if (metadata.representationMinority?.length) body.representation_minority = metadata.representationMinority;
  if (metadata.primaryLanguages?.length) body.primary_languages = metadata.primaryLanguages;
  if (metadata.language) body.language = metadata.language;
  if (metadata.email) body.email = metadata.email;
  // Explicit boolean either way — the backend's consent gate treats absence as refusal.
  body.b2b_consent = metadata.biConsent === true;
  if (metadata.formatEligibilityAcknowledged !== undefined) {
    body.format_eligibility_acknowledged = metadata.formatEligibilityAcknowledged;
  }
  return body;
}

function normaliseComplexity(value: unknown): ScriptAnalysis['complexity'] {
  if (value === 'Low' || value === 'Medium' || value === 'High' || value === 'Very High') {
    return value;
  }
  return 'Medium';
}

export function normaliseAnalysisData(
  analysisData: Partial<ScriptAnalysis>,
  metadata: ScriptMetadata
): ScriptAnalysis {
  return {
    id: analysisData.id,
    genre: analysisData.genre || (metadata.genre.length ? metadata.genre.join(', ') : 'Unknown'),
    tone: analysisData.tone || metadata.targetAudience?.join(', ') || 'Production-ready with balanced commercial and creative intent',
    scale: analysisData.scale || metadata.format || 'Unknown format',
    complexity: normaliseComplexity(analysisData.complexity),
    executiveSummary: analysisData.executiveSummary ?? null,
    financialAnalysis: analysisData.financialAnalysis ?? null,
    sectionExplainers: analysisData.sectionExplainers ?? null,
    locationRankings: toArray<LocationRanking>(analysisData.locationRankings),
    incentiveEstimates: toArray<IncentiveEstimate>(analysisData.incentiveEstimates),
    formatEligibilityCaveat: analysisData.formatEligibilityCaveat ?? null,
    programmeAvailabilityCaveat: analysisData.programmeAvailabilityCaveat ?? null,
    shortFormatIncentiveNotice: analysisData.shortFormatIncentiveNotice ?? null,
    comparables: toArray<ComparableProduction>(analysisData.comparables),
    // The report viewer reads these directly. They were never carried through this
    // mapper, so the Festivals & Distributors tab could only ever render its empty
    // state — even when the backend had matched five festivals and the PDF printed
    // them. A missing key here is indistinguishable from no matches downstream.
    festivalRecommendations: toArray<any>(analysisData.festivalRecommendations),
    distributorRecommendations: toArray<any>(analysisData.distributorRecommendations),
    weatherLogistics: toArray<WeatherLogistics>(analysisData.weatherLogistics),
    fundingOpportunities: toArray<FundingOpportunity>(analysisData.fundingOpportunities),
    scriptTitle: analysisData.scriptTitle || metadata.title,
    generatedAt: analysisData.generatedAt || new Date().toISOString(),
  };
}

export function mapReportToAnalysis(report: any, metadata: ScriptMetadata, isPreview = false): ScriptAnalysis {
  const reportData = report?.report_data || {};
  const territoryAnalysis = toArray<any>(reportData.territoryAnalysis);
  const productionDetails = reportData.productionDetails || {};

  const locationRankings: LocationRanking[] = territoryAnalysis.map((territory: any) => ({
    name: territory.territory || 'Unknown Territory',
    country: territory.country || 'Unknown',
    // `Number(x || 0)` reported an unscored territory as a hard 0, which reads as
    // "we scored it and it came last" rather than "we could not score it".
    score: territory.overallScore == null ? null : clampScore(Number(territory.overallScore)),
    // Read, never derived. Each of these used to be invented here when the
    // legacy payload did not carry it: costEfficiency defaulted to 60,
    // currencyAdvantage was the constant 65, crewDepth and infrastructure were
    // both read off locationMatch.score (the same number under two labels), and
    // incentiveStrength was 80 or 45 depending on whether any incentive row
    // existed at all. None of that is a measurement. The backend computes all
    // six from the incentive database and territory profiles; where it has no
    // basis for a score it reports null, and so must this.
    costEfficiency: optionalScore(territory.costEfficiencyScore),
    crewDepth: optionalScore(territory.crewDepthScore),
    infrastructure: optionalScore(territory.infrastructureScore),
    crewDepthTier: territory.crewDepthTier ?? null,
    infrastructureTier: territory.infrastructureTier ?? null,
    incentiveStrength: optionalScore(territory.incentiveStrength),
    currencyAdvantage: optionalScore(territory.currencyAdvantage),
    incentiveReliability: optionalScore(territory.incentiveReliability),
    bankabilityLabel: territory.bankabilityLabel ?? null,
    reasoning: toArray<string>(territory.locationMatch?.reasons).length
      ? toArray<string>(territory.locationMatch?.reasons)
      : ['Territory assessed from production fit and available incentives.'],
    isAssessmentOnly: isPreview,
  }));

  const incentiveEstimates: IncentiveEstimate[] = territoryAnalysis.flatMap((territory: any) => {
    const incentives = toArray<any>(territory.incentives);
    if (!incentives.length) {
      return [
        {
          territory: territory.territory || 'Unknown Territory',
          program: 'No active incentive mapped',
          rate: 'N/A',
          cap: 'N/A',
          qualifyingSpend: 'See full report',
          estimatedRebate: 'N/A',
          requirements: ['Program details unavailable for this territory.'],
          disclaimer: 'Figures are indicative and subject to local authority rules.',
          dataSource: 'Prodculator backend datasets',
          lastUpdated: new Date().toISOString(),
          bankabilityLabel: null,
        },
      ];
    }

    return incentives.map((inc: any) => ({
      territory: territory.territory || 'Unknown Territory',
      program: inc.programName || 'Tax Incentive Program',
      rate: inc.rate || 'N/A',
      cap: inc.cap || 'N/A',
      qualifyingSpend: 'Minimum local spend varies by territory',
      // An incentive figure, and the platform's version of the PDF bug: a rebate
      // nobody could compute was rendered as a confident zero-value amount. The
      // wording matches the PDF's convention for the same state.
      estimatedRebate:
        inc.potentialRebateUSD == null
          ? 'not available to this production'
          : formatCurrency(Number(inc.potentialRebateUSD)),
      requirements: toArray<string>(territory.pros).length
        ? toArray<string>(territory.pros)
        : ['Subject to local eligibility and compliance criteria.'],
      disclaimer: 'Estimate only. Final eligibility depends on official approval.',
      dataSource: 'Prodculator backend datasets',
      lastUpdated: new Date().toISOString(),
      bankabilityLabel: inc.bankabilityLabel ?? territory.bankabilityLabel ?? null,
    }));
  });

  // The builder emits `comparables`; only the older payload shape used
  // `comparableProductions`. Reading one key alone is why the platform and the
  // PDF reported different comparable counts for the same report.
  const comparableRows = toArray<any>(reportData.comparables).length
    ? toArray<any>(reportData.comparables)
    : toArray<any>(reportData.comparableProductions);
  const comparables: ComparableProduction[] = comparableRows.map((item: any) => ({
    title: item.title || 'Comparable Project',
    genre: toArray<string>(item.genres).join(', ') || metadata.genre.join(', '),
    budgetRange: item.budget || `${metadata.budgetCurrency} ${metadata.budgetAmount}`,
    visualScale: 'Comparable production scale',
    location: item.territory || 'Unknown',
    year: Number(item.year || new Date().getFullYear()),
    source: 'Prodculator backend comparables',
  }));

  // Read from the report, not manufactured from it.
  //
  // This block used to synthesise a weather section for every territory: the
  // same four best months for all of them, Apr/May/Sep/Oct, and a weather risk
  // derived from the territory's overall score. Neither has anything to do with
  // weather. The backend builds weatherLogistics from territory_weather against
  // the actual shoot window, which is why the PDF and the platform disagreed
  // about the same territory's shoot-window risk.
  const weatherLogistics: WeatherLogistics[] = toArray<any>(
    reportData.weatherLogistics,
  ).map((w: any) => ({
    territory: w.territory || w.name || 'Unknown Territory',
    bestMonths: toArray<string>(w.bestMonths),
    weatherRisk: w.weatherRisk ?? null,
    infrastructure: w.infrastructure ?? null,
    travelVisa: w.travelVisa ?? null,
  }));

  const fundingOpportunities: FundingOpportunity[] = [
    ...toArray<any>(reportData.grantOpportunities).map((grant: any) => ({
      type: 'Fund' as const,
      name: grant.title || 'Grant Opportunity',
      genre: metadata.genre,
      deadline: grant.deadline || '',
      notes: `${grant.organization || 'Program'} • ${grant.amount || 'Amount varies'}`,
    })),
    ...toArray<any>(reportData.festivalRecommendations).map((festival: any) => ({
      type: 'Festival' as const,
      name: festival.name || 'Festival Opportunity',
      genre: metadata.genre,
      deadline: festival.deadline || '',
      notes: `${festival.location || 'Global'} • Tier ${festival.tier || 'N/A'}`,
      tier: festival.tier,
    })),
  ];

  const genres = toArray<string>(productionDetails.genres);
  const genre = genres.length ? genres.join(', ') : (metadata.genre.length ? metadata.genre.join(', ') : 'Unknown');
  const shootingDays = Number(productionDetails.estimatedShootingDays || 0);

  return {
    id: report?.id,
    genre,
    tone: metadata.targetAudience?.join(', ') || 'Production-ready with balanced commercial and creative intent',
    scale: `${productionDetails.format || metadata.format || 'feature'} • ${productionDetails.crewSize || metadata.crewSize || 'medium'} crew`,
    complexity: complexityFromDays(shootingDays),
    executiveSummary: reportData.executiveSummary ?? null,
    financialAnalysis: reportData.financialAnalysis ?? null,
    sectionExplainers: reportData.sectionExplainers ?? null,
    locationRankings,
    incentiveEstimates,
    formatEligibilityCaveat: reportData.formatEligibilityCaveat ?? null,
    programmeAvailabilityCaveat: reportData.programmeAvailabilityCaveat ?? null,
    shortFormatIncentiveNotice: reportData.shortFormatIncentiveNotice ?? null,
    festivalRecommendations: toArray<any>(reportData.festivalRecommendations),
    distributorRecommendations: toArray<any>(reportData.distributorRecommendations),
    comparables,
    weatherLogistics,
    fundingOpportunities,
    scriptTitle: reportData.scriptTitle || metadata.title,
    generatedAt: reportData.generatedAt || report?.completed_at || new Date().toISOString(),
  };
}
