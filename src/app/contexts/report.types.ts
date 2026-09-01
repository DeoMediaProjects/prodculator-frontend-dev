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
  /** Present only for a co-production. Absent for a comparison, rather than
   *  empty: a section that renders with nothing in it reads as a bug. */
  coProductionStructure?: CoProductionStructure | null;
  /** Present only for "undecided" — territories in the comparison whose
   *  programme states an official co-production treaty route, kept separate
   *  from coProductionStructure since no structure has actually been chosen. */
  coProductionOpportunities?: CoProductionOpportunity[] | null;
  /** Explainer for the six location-ranking dimensions — shown once, above the
   *  ranked territory table. */
  scoringMethodology?: ScoringMethodology | null;
  /** The script's own setting, when it wasn't among the compared territories. */
  scriptOriginCallout?: ScriptOriginCallout | null;
  /** Per-territory detail beyond the ranking table. */
  territoryDeepDives?: TerritoryDeepDive[] | null;
  /** Present only on paid tiers — the backend omits it for previews and the
   *  free-tier filter strips it, so its presence here is the tier gate. */
  financialReadiness?: FinancialReadiness | null;
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
  /** The single conclusion about this figure, drawn from the verdicts above
   *  rather than a fourth opinion alongside them. Between bankability, format
   *  eligibility, programme availability and confirmation, a reader had to work
   *  out for themselves whether the number could be relied on. */
  calculationStatus?:
    | 'ESTIMATED' | 'CONDITIONAL' | 'REQUIRES_COST_BREAKDOWN' | 'NOT_ELIGIBLE'
    | 'PROGRAMME_UNVERIFIED' | 'BLOCKED' | 'SUSPENDED' | 'NO_PROGRAMME'
    | null;
  calculationStatusLabel?: string | null;
  calculationStatusMeaning?: string | null;
  /** Why this status, in the producer's terms: one entry per failed gate or
   *  missing input, so a refusal can be checked rather than taken on trust. */
  calculationStatusReasons?: string[] | null;
  /** What would move it off this status. Absent where there is no next step. */
  calculationStatusNextStep?: string | null;
  /** Whether this status permits a figure at all. Read this rather than testing
   *  for the presence of an amount: an illustrative figure and a relied-upon one
   *  are indistinguishable once rendered. */
  calculationCarriesFigure?: boolean | null;
  calculationInRanking?: boolean | null;
  /** The governance gate, deliberately separate from the status above. A verified
   *  source means the rate is what the statute says, not that the formula
   *  applying it has cleared internal review. */
  calculationVerification?: 'ready' | 'conditional' | 'blocked' | null;
  calculationVerificationLabel?: string | null;
  calculationIsApproved?: boolean | null;
}

/** A territory in an "undecided" comparison whose programme states an
 *  official co-production treaty route — informational only, never implies
 *  the territories have been combined into one production. */
export interface CoProductionOpportunity {
  territory: string;
  program: string | null;
}

export interface ScoringDimension {
  name: string;
  key: string;
  description: string;
}

export interface ScoringColorKey {
  green: string;
  gold: string;
  red: string;
}

/** How the six location-ranking dimensions are scored and weighted — the
 *  same explainer the PDF prints before the ranked territory table. */
export interface ScoringMethodology {
  overview: string;
  dimensions: ScoringDimension[];
  weightingNote: string;
  colorKey: ScoringColorKey;
}

/** The script's own setting, shown separately from the ranked territories
 *  when it wasn't one of the compared options — see the PDF's "Script-origin
 *  territory" callout. */
export interface ScriptOriginCallout {
  territory: string;
  hasIncentiveProgramme: boolean;
  scenesPct?: number | null;
  programmeNote?: string | null;
  currencyAdvantage?: number | null;
  crewDepthTier?: string | null;
}

/** Per-territory detail beyond the ranking table: rebate mechanics,
 *  infrastructure, payment speed, and the specific advantages/risks of
 *  shooting there. */
export interface TerritoryDeepDive {
  name: string;
  country: string;
  score: number;
  rebate: string;
  headlineRate?: string | null;
  infrastructure: string;
  paymentSpeed: string;
  keyAdvantages: string[];
  keyRisks: string[];
  culturalTestLikelihood: string;
  adminComplexity: string;
  estimatedRebate: string;
  incentiveIsConfirmed?: boolean;
  incentiveEligibilityLabel?: string | null;
  confirmedIncentive?: string | null;
  potentialIncentive?: string | null;
}

export interface ReadinessFigure {
  label: string;
  value: string;
  basis: string;
}

export interface ReadinessCheck {
  result: 'pass' | 'fail' | 'warn' | 'skipped';
  detail: string;
}

export interface ReadinessComponent {
  key: string;
  label: string;
  status: 'ready' | 'conditional' | 'insufficient_data' | 'not_ready';
  weight: number;
  headline: string;
  figures: ReadinessFigure[];
  checks: ReadinessCheck[];
  note?: string | null;
  grade?: string | null;
}

export interface ReadinessFlag {
  severity: 'critical' | 'warning' | 'info';
  input: string;
  label?: string | null;
  detail: string;
  action: string;
}

/** Deterministic verdict on whether the production can be financed as
 *  planned — no AI involved, every figure cites its input. */
export interface FinancialReadiness {
  verdict: 'READY' | 'CONDITIONAL' | 'NOT READY' | 'INSUFFICIENT DATA';
  verdictReason: string;
  rule: string;
  score: number;
  territory: string;
  programme?: string | null;
  currencySymbol: string;
  components: ReadinessComponent[];
  flags: ReadinessFlag[];
  flagCounts: Record<string, number>;
  methodology: string;
  computedOn: string;
}

export interface CoProductionPartner {
  territory: string | null;
  /** Null means the producer has not told us. Never treated as zero, which would
   *  report a shortfall against the budget that may not exist. */
  allocatedSpend: number | null;
  currency: string | null;
  participationPercent: number | null;
  partnerStatus: string;
  programme: string | null;
  incentive: string | null;
  calculationStatus: string | null;
  calculationStatusLabel: string | null;
}

/** Partners in one production, reconciled rather than ranked.
 *
 *  Every other territory list in the report ranks. This one must not: the
 *  partners are not competing for the production, they each hold a share of it,
 *  so ordering them best-first would state something false about the structure.
 *  `partnersAreRanked` is on the object so no surface decides that for itself. */
export interface CoProductionStructure {
  mode: string;
  partners: CoProductionPartner[];
  partnerCount: number;
  currency: string | null;
  budget: number | null;
  unallocatedSpend: number | null;
  reconciliationStatus: 'reconciled' | 'under_allocated' | 'over_allocated' | 'not_assessable';
  reconciliationLabel: string;
  reconciliationExplanation: string;
  /** Positive is under-allocated, negative is over-allocated, null when the
   *  shares cannot be assessed at all. */
  reconciliationRemaining: number | null;
  route: string | null;
  supranationalInterest: string | null;
  structureNotes: string[];
  partnersAreRanked: boolean;
  /** The partner incentives are never summed: cumulation ceilings and public
   *  support intensity limits bite on the total, and none has been assessed. */
  combinedIncentiveWithheld: boolean;
  combinedIncentiveReason: string;
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
