import { createContext, useContext, useState, ReactNode } from 'react';
import { apiClient } from '@/services/api';
import { authService } from '@/services/auth.service';
import { databaseService } from '@/services/database.service';

/**
 * Thrown when report generation polling exceeds the timeout window.
 * Carries the reportId so callers can surface a "still processing" UX
 * rather than a generic error message.
 */
export class ReportTimeoutError extends Error {
  readonly reportId: string;
  constructor(reportId: string) {
    super('Report generation is taking longer than expected.');
    this.name = 'ReportTimeoutError';
    this.reportId = reportId;
  }
}

interface ActionTimelineItem {
  action: string;
  deadline?: string | null;
  note?: string | null;
}

interface FinancialScenario {
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

interface ScriptAnalysis {
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

  // Tab 5: Comparable Productions
  comparables: ComparableProduction[];

  // Tab 6: Weather & Logistics
  weatherLogistics: WeatherLogistics[];

  // Tab 7: Funding & Festivals
  fundingOpportunities: FundingOpportunity[];

  // Metadata
  scriptTitle: string;
  generatedAt: string;
}

interface LocationRanking {
  name: string;
  country: string;
  score: number;
  costEfficiency: number;
  crewDepth: number;
  infrastructure: number;
  crewDepthTier?: string | null;
  infrastructureTier?: string | null;
  incentiveStrength: number;
  currencyAdvantage: number;
  incentiveReliability?: number | null;
  bankabilityLabel?: 'BANKABLE' | 'VERIFY FIRST' | 'NOT BANKABLE' | null;
  reasoning: string[];
  isAssessmentOnly?: boolean;
}

interface IncentiveEstimate {
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
}

interface ComparableProduction {
  title: string;
  genre: string;
  budgetRange: string;
  visualScale: string;
  location: string;
  year: number;
  source: string;
}

interface WeatherLogistics {
  territory: string;
  bestMonths: string[];
  weatherRisk: 'Low' | 'Medium' | 'High';
  infrastructure: string;
  travelVisa: string;
  avgTempRange?: string;
  avgRainfall?: string;
  daylightHours?: string;
  seasonalConsiderations?: string;
}

interface FundingOpportunity {
  type: 'Fund' | 'Festival';
  name: string;
  genre: string[];
  deadline: string;
  notes: string;
  website?: string;
  tier?: string;
}

interface ScriptMetadata {
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
}

interface ScriptContextType {
  uploadedFile: File | null;
  setUploadedFile: (file: File | null) => void;
  analysis: ScriptAnalysis | null;
  setAnalysis: (analysis: ScriptAnalysis | null) => void;
  generateAnalysis: (file: File, metadata: ScriptMetadata) => Promise<ScriptAnalysis>;
  generatePreview: (metadata: ScriptMetadata) => Promise<ScriptAnalysis>;
  isProcessing: boolean;
}

interface ReportStatusResponse {
  status: 'processing' | 'completed' | 'failed';
  report_id: string;
  message?: string;
  error?: string;
}

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function buildReportRequestBody(
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
  return body;
}

function normaliseComplexity(value: unknown): ScriptAnalysis['complexity'] {
  if (value === 'Low' || value === 'Medium' || value === 'High' || value === 'Very High') {
    return value;
  }
  return 'Medium';
}

function normaliseAnalysisData(
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
    comparables: toArray<ComparableProduction>(analysisData.comparables),
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

  const locationRankings: LocationRanking[] = territoryAnalysis.map((territory: any) => {
    const incentive = toArray<any>(territory.incentives)[0];

    return {
      name: territory.territory || 'Unknown Territory',
      country: territory.country || 'Unknown',
      score: clampScore(Number(territory.overallScore || 0)),
      costEfficiency: clampScore(Number(territory.costEfficiencyScore ?? 60)),
      crewDepth: clampScore(Number(territory.locationMatch?.score || 60)),
      infrastructure: clampScore(Number(territory.locationMatch?.score || 65)),
      crewDepthTier: territory.crewDepthTier ?? null,
      infrastructureTier: territory.infrastructureTier ?? null,
      incentiveStrength: clampScore(incentive ? 80 : 45),
      currencyAdvantage: clampScore(65),
      incentiveReliability: territory.incentiveReliability != null ? clampScore(Number(territory.incentiveReliability)) : null,
      bankabilityLabel: territory.bankabilityLabel ?? null,
      reasoning: toArray<string>(territory.locationMatch?.reasons).length
        ? toArray<string>(territory.locationMatch?.reasons)
        : ['Territory assessed from production fit and available incentives.'],
      isAssessmentOnly: isPreview,
    };
  });

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
      estimatedRebate: formatCurrency(Number(inc.potentialRebateUSD || 0)),
      requirements: toArray<string>(territory.pros).length
        ? toArray<string>(territory.pros)
        : ['Subject to local eligibility and compliance criteria.'],
      disclaimer: 'Estimate only. Final eligibility depends on official approval.',
      dataSource: 'Prodculator backend datasets',
      lastUpdated: new Date().toISOString(),
      bankabilityLabel: inc.bankabilityLabel ?? territory.bankabilityLabel ?? null,
    }));
  });

  const comparables: ComparableProduction[] = toArray<any>(reportData.comparableProductions).map((item: any) => ({
    title: item.title || 'Comparable Project',
    genre: toArray<string>(item.genres).join(', ') || metadata.genre.join(', '),
    budgetRange: item.budget || `${metadata.budgetCurrency} ${metadata.budgetAmount}`,
    visualScale: 'Comparable production scale',
    location: item.territory || 'Unknown',
    year: Number(item.year || new Date().getFullYear()),
    source: 'Prodculator backend comparables',
  }));

  const weatherLogistics: WeatherLogistics[] = locationRankings.slice(0, 5).map((location) => ({
    territory: location.name,
    bestMonths: ['Apr', 'May', 'Sep', 'Oct'],
    weatherRisk: location.score >= 75 ? 'Low' : location.score >= 55 ? 'Medium' : 'High',
    infrastructure: location.infrastructure >= 70 ? 'Strong production infrastructure' : 'Moderate infrastructure',
    travelVisa: 'Confirm local visa/permit requirements before locking schedule',
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
    comparables,
    weatherLogistics,
    fundingOpportunities,
    scriptTitle: reportData.scriptTitle || metadata.title,
    generatedAt: reportData.generatedAt || report?.completed_at || new Date().toISOString(),
  };
}

export function ScriptProvider({ children }: { children: ReactNode }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pollReportStatus = async (reportId: string): Promise<ReportStatusResponse> => {
    const timeoutMs = 60000;
    const pollIntervalMs = 3000;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const status = await apiClient.get<ReportStatusResponse>(`/api/reports/${reportId}/status`, {
        auth: true,
      });
      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new ReportTimeoutError(reportId);
  };

  // Calls backend pipeline: create report (multipart) -> background processing -> fetch report.
  const generateAnalysis = async (file: File, metadata: ScriptMetadata): Promise<ScriptAnalysis> => {
    setIsProcessing(true);

    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        throw new Error('You must be signed in to generate a full report.');
      }

      const body = buildReportRequestBody(metadata, 'paid');

      // Single multipart request: script file + metadata together
      const form = new FormData();
      form.append('script_file', file);
      form.append('body', JSON.stringify(body));

      const createResponse = await apiClient.upload<{ status: string; report_id: string }>(
        '/api/reports',
        form,
        { auth: true }
      );
      if (!createResponse.report_id) {
        throw new Error('Failed to create report');
      }

      const status = await pollReportStatus(createResponse.report_id);
      if (status.status === 'failed') {
        throw new Error(status.error || status.message || 'Report generation failed');
      }

      const { report, error } = await databaseService.getReport(createResponse.report_id);
      if (error || !report) {
        throw new Error(error || 'Failed to fetch completed report');
      }

      // Use direct analysis if backend returns it in the guide's shape, else fall back to mapper
      const analysisData = (report as any).analysis;
      const mapped = analysisData?.locationRankings
        ? normaliseAnalysisData(
          {
            ...analysisData,
            id: report.id,
            scriptTitle: metadata.title,
            generatedAt: report.completed_at || report.created_at || new Date().toISOString(),
          },
          metadata
        )
        : mapReportToAnalysis(report, metadata);
      setAnalysis(mapped);
      return mapped;
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview uses the JSON-only backend contract — synchronous, no auth needed.
  const generatePreview = async (metadata: ScriptMetadata): Promise<ScriptAnalysis> => {
    setIsProcessing(true);

    try {
      const body = buildReportRequestBody(metadata, 'preview');
      const response = await apiClient.post<{ reportType: string; analysis: ScriptAnalysis }>(
        '/api/reports/preview',
        body
      );

      const analysisData = normaliseAnalysisData(response.analysis, metadata);
      setAnalysis(analysisData);
      return analysisData;
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScriptContext.Provider
      value={{
        uploadedFile,
        setUploadedFile,
        analysis,
        setAnalysis,
        generateAnalysis,
        generatePreview,
        isProcessing,
      }}
    >
      {children}
    </ScriptContext.Provider>
  );
}

export function useScript() {
  const context = useContext(ScriptContext);
  if (context === undefined) {
    throw new Error('useScript must be used within ScriptProvider');
  }
  return context;
}

export type {
  ScriptAnalysis,
  LocationRanking,
  IncentiveEstimate,
  ComparableProduction,
  WeatherLogistics,
  FundingOpportunity,
  ScriptMetadata,
  ActionTimelineItem,
  FinancialScenario,
};
