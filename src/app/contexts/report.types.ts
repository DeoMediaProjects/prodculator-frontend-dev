/**
 * Shared report types.
 *
 * Split out of ScriptContext so the pure mapper (reportMapping.ts) and its tests
 * can use them without importing the provider, the api client or auth. Types
 * only — no values, so importing this pulls in nothing at runtime.
 */

export interface ActionTimelineItem {
  action: string;
  deadline?: string | null;
  note?: string | null;
}

export interface FinancialScenario {
  territory?: string;
  // v3 6-step fields
  totalBudget?: string | null;
  qualifyingSpendPct?: string | null;
  qualifyingSpend?: string | null;
  atlDeduction?: string | null;
  netQualifyingSpend?: string | null;
  programme?: string | null;
  rateGross?: string | null;
  rateNet?: string | null;
  grossRebate?: string | null;
  netRebate?: string | null;
  netBudget?: string | null;
  notes?: string | null;
  // legacy (deprecated but still present in transition)
  localSpend?: string | null;
  rebateRate?: string | null;
}

export interface ScriptAnalysis {
  id?: string;
  // Tab 1: Script Summary
  genre: string;
  tone: string;
  scale: string;
  complexity: 'Low' | 'Medium' | 'High' | 'Very High';

  // Executive Summary (v3)
  executiveSummary?: {
    headlineNetBudget?: string | null;
    actionTimeline?: ActionTimelineItem[] | null;
    keyFlags?: string[] | null;
    recommendedTerritories?: string[];
    [key: string]: unknown;
  } | null;

  // Financial Analysis (v3)
  financialAnalysis?: {
    budgetScenarios?: FinancialScenario[] | null;
    [key: string]: unknown;
  } | null;

  // Section explainers (v3)
  sectionExplainers?: Record<string, string> | null;

  // Tab 2: Location Rankings
  locationRankings: LocationRanking[];

  // Tab 3: Tax Incentives
  incentiveEstimates: IncentiveEstimate[];
  /** Blanket caveat, set by the backend only while some programme in this report
   *  is unverified for the production's format. Absent means every programme has
   *  an answer, so no blanket warning is warranted. */
  formatEligibilityCaveat?: string | null;
  /** Blanket caveat set by the backend only while some programme fails its own
   *  thresholds. Separate from the format caveat: different problem, different fix. */
  programmeAvailabilityCaveat?: string | null;
  /** Short-form only, and only when some displayed incentive is potential rather
   *  than confirmed. Rendered beside the figures, not at the report's edges. */
  shortFormatIncentiveNotice?: string | null;

  // Tab 5: Comparable Productions
  comparables: ComparableProduction[];

  // Tab 6: Weather & Logistics
  weatherLogistics: WeatherLogistics[];

  // Tab 7: Funding & Festivals
  fundingOpportunities: FundingOpportunity[];
  /** Matched festivals, passed through from the report. */
  festivalRecommendations?: any[];
  /** Distributors, ranked partly on the festivals above. */
  distributorRecommendations?: any[];

  // Metadata
  scriptTitle: string;
  generatedAt: string;
}

export interface LocationRanking {
  name: string;
  country: string;
  // Nullable for the same reason as the dimension scores below: the mapper used to
  // coerce a missing overall score to 0 with `Number(x || 0)`, so an unscored
  // territory and one that genuinely scored zero were the same number on the page.
  // ReportViewer already guarded this with `loc.score != null` — the guard could
  // simply never fire, because the null never survived the mapper.
  score: number | null;
  // Nullable because the backend genuinely does not score every dimension for
  // every territory: no sourced cost data, or an incentive whose eligibility is
  // unresolved, are reported as null rather than guessed. `null` is "not
  // scored"; `0` is "scored, and the answer is zero". Typing these as `number`
  // is what let the platform print 0 for both.
  costEfficiency: number | null;
  crewDepth: number | null;
  infrastructure: number | null;
  crewDepthTier?: string | null;
  infrastructureTier?: string | null;
  incentiveStrength: number | null;
  currencyAdvantage: number | null;
  incentiveReliability?: number | null;
  bankabilityLabel?: 'BANKABLE' | 'VERIFY FIRST' | 'NOT BANKABLE' | null;
  reasoning: string[];
  isAssessmentOnly?: boolean;
}

export interface IncentiveEstimate {
  territory: string;
  program: string;
  rate: string;
  cap: string;
  qualifyingSpend: string;
  estimatedRebate: string;
  requirements: string[];
  disclaimer: string;
  dataSource: string;
  lastUpdated: string;
  bankabilityLabel?: 'BANKABLE' | 'VERIFY FIRST' | 'NOT BANKABLE' | null;
  /** Whether this specific programme accepts the production's format, evaluated
   *  by the backend. The report and the PDF render the same object, so the two
   *  cannot disagree about it. Absent on the legacy synthesis path below, where
   *  no programme record was consulted. */
  formatEligibility?: {
    verdict: 'eligible' | 'ineligible' | 'needs_confirmation' | 'unverified';
    label: string;
    confirmed: boolean;
    explanation: string;
    sourceUrl?: string | null;
    verifiedAt?: string | null;
  } | null;
  /** False when the rebate figure rests on an unconfirmed eligibility assumption.
   *  The figure still shows; it is labelled rather than hidden. */
  rebateIsConfirmed?: boolean;
  /** Whether this figure may be presented as an amount the production can rely on.
   *  Never infer this from the presence of an amount: an illustrative calculation
   *  and a confirmed one look identical as numbers. */
  incentiveIsConfirmed?: boolean;
  incentiveEligibilityStatus?: 'eligible' | 'ineligible' | 'needs_confirmation' | 'unverified' | null;
  /** The amount that may enter confirmed totals, or null when nothing may. */
  confirmedIncentive?: string | null;
  /** The illustrative calculation, present only when it is NOT confirmed. */
  potentialIncentive?: string | null;
  /** Whether the production clears this programme's own stated thresholds:
   *  minimum qualifying spend, budget ceiling, expiry, status. A blunter question
   *  than format eligibility, and the one that withdraws the figure rather than
   *  annotating it. `reasons` carries the arithmetic behind each gate. */
  programmeEligibility?: {
    verdict: 'available' | 'unavailable' | 'unverifiable';
    label: string;
    available: boolean;
    rebateIsClaimable: boolean;
    explanation?: string | null;
    reasons?: Array<{ gate: string; outcome: 'pass' | 'fail' | 'untested'; detail: string }>;
  } | null;
}

export interface ComparableProduction {
  title: string;
  genre: string;
  budgetRange: string;
  visualScale: string;
  location: string;
  year: number;
  source: string;
}

export interface WeatherLogistics {
  territory: string;
  bestMonths: string[];
  // Nullable: a territory with no sourced weather record has no risk rating, and
  // inventing one from its overall score is what this used to do.
  weatherRisk: 'Low' | 'Medium' | 'High' | null;
  infrastructure: string | null;
  travelVisa: string | null;
  avgTempRange?: string;
  avgRainfall?: string;
  daylightHours?: string;
  seasonalConsiderations?: string;
}

export interface FundingOpportunity {
  type: 'Fund' | 'Festival';
  name: string;
  genre: string[];
  deadline: string;
  notes: string;
  website?: string;
  tier?: string;
}

/** One producer-supplied statutory cost base, with its provenance.
 *
 *  `amount` is nullable on purpose. Null means the producer has not told us;
 *  zero means they have told us it is nil. Those produce different calculation
 *  statuses, so collapsing them would defeat the rule the rebuild turns on. */
export interface ScenarioCalculationInputPayload {
  input_key: string;
  amount: number | null;
  currency?: string;
  input_status: 'known' | 'planning_assumption' | 'unknown';
  input_source?: 'user_entered' | 'imported_budget' | 'verified_cost_report';
}

export interface TerritoryScenarioInput {
  territory: string;
  scenario_spend: number | null;
  scenario_currency?: string;
  scenario_spend_source: 'user_entered' | 'imported_budget' | 'unknown';
  /** Co-production only. The backend rejects these in comparison mode, where a
   *  territory is an alternative rather than a partner. */
  participation_percent?: number;
  partner_status?: 'candidate' | 'confirmed';
  calculation_inputs: ScenarioCalculationInputPayload[];
}

export interface ScriptMetadata {
  title: string;
  genre: string[];
  budgetAmount: number;
  budgetCurrency: string;
  format: string;
  country: string;
  stateProvince?: string;
  // Location strategy removed from the intake form (redundant with
  // territoriesConsidering); optional for backward compatibility.
  locationStrategy?: string;
  productionPriority: string;
  territoriesConsidering?: string[];
  /** How the selected territories relate to one another.
   *
   *  Not cosmetic. It decides whether the spends below are alternatives to be
   *  ranked or allocations inside one production to be reconciled, and the
   *  backend rejects co-production-only fields in a comparison mode. */
  productionStructureMode?: 'comparison' | 'coproduction' | 'undecided';
  territoryScenarios?: TerritoryScenarioInput[];
  /** Co-production only: spend earning nothing in any partner territory. */
  unallocatedSpend?: number;
  coProductionRoute?: string;
  supranationalSupportInterest?:
    | 'show_opportunity'
    | 'not_considering'
    | 'application_planned';
  filmingStart?: string;
  filmingDuration?: string;
  cameraEquipment?: string[];
  crewSize?: number;
  principalCast?: number;
  supportingCast?: number;
  // Intake contract fields (intake_schema.json)
  completionDate?: string;            // required by the form; festival timing window
  mustFilmIn?: string;                // hard territory constraint
  coProductionInterest?: 'yes' | 'no' | 'undecided';
  targetAudience?: string[];          // declared age quadrants — never inferred
  audienceSegments?: string[];        // e.g. lgbtq_audience (routed from skew dropdown)
  audienceSkew?: string;              // female_leaning / male_leaning / balanced — stored, not scored
  representationGender?: string;      // strict opt-in
  representationMinority?: string[];  // strict opt-in
  primaryLanguages?: string[];        // max 5
  language?: string;
  email?: string;
  // Business Intelligence consent — explicit opt-in to aggregate this
  // production's anonymised signals. Defaults to false when omitted.
  biConsent?: boolean;
  /** Set when the production format is one whose incentive eligibility the
   *  programme data does not record (today: short films), and the producer has
   *  confirmed they understand the rebate figures assume eligibility. Recorded
   *  with the request because the report states the same caveat. */
  formatEligibilityAcknowledged?: boolean;
}
