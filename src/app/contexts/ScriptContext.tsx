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

  // Tab 4: Crew & Costs
  crewInsights: CrewInsight[];

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

interface CrewInsight {
  territory: string;
  availability: 'High' | 'Medium' | 'Low';
  costVsUSD: string;
  qualityRating: number;
  specialties: string[];
  tradeoff: string;
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
  locationStrategy: string;
  productionPriority: string;
  territoriesConsidering?: string[];
  filmingStart?: string;
  filmingDuration?: string;
  cameraEquipment?: string[];
  crewSize?: number;
  principalCast?: number;
  supportingCast?: number;
  targetAudience?: string;
  language?: string;
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
    location_strategy: metadata.locationStrategy,
    production_priority: metadata.productionPriority,
  };
  if (metadata.stateProvince) body.state_province = metadata.stateProvince;
  if (metadata.territoriesConsidering?.length) body.territories_considering = metadata.territoriesConsidering;
  if (metadata.filmingStart) body.filming_start_date = metadata.filmingStart;
  if (metadata.filmingDuration) body.filming_duration = Number(metadata.filmingDuration);
  if (metadata.cameraEquipment?.length) body.camera_equipment = metadata.cameraEquipment;
  if (metadata.crewSize) body.crew_size = metadata.crewSize;
  if (metadata.principalCast) body.principal_cast = metadata.principalCast;
  if (metadata.supportingCast) body.supporting_cast = metadata.supportingCast;
  if (metadata.targetAudience) body.target_audience = metadata.targetAudience;
  if (metadata.language) body.language = metadata.language;
  return body;
}

export function mapReportToAnalysis(report: any, metadata: ScriptMetadata, isPreview = false): ScriptAnalysis {
  const reportData = report?.report_data || {};
  const territoryAnalysis = toArray<any>(reportData.territoryAnalysis);
  const productionDetails = reportData.productionDetails || {};

  const locationRankings: LocationRanking[] = territoryAnalysis.map((territory: any) => {
    const incentive = toArray<any>(territory.incentives)[0];
    const crewTotal = Number(territory.estimatedCrewCosts?.totalForProduction || 0);

    return {
      name: territory.territory || 'Unknown Territory',
      country: territory.country || 'Unknown',
      score: clampScore(Number(territory.overallScore || 0)),
      costEfficiency: clampScore(100 - Math.min(crewTotal / 25000, 100)),
      crewDepth: clampScore(Number(territory.locationMatch?.score || 60)),
      infrastructure: clampScore(Number(territory.locationMatch?.score || 65)),
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

  const crewInsights: CrewInsight[] = territoryAnalysis.map((territory: any) => {
    const estimatedCrewCosts = territory.estimatedCrewCosts || {};
    const breakdown = toArray<any>(estimatedCrewCosts.breakdown);
    const specialties = breakdown.slice(0, 5).map((item: any) => item.role || 'Crew Role');

    return {
      territory: territory.territory || 'Unknown Territory',
      availability: breakdown.length >= 8 ? 'High' : breakdown.length >= 4 ? 'Medium' : 'Low',
      costVsUSD: `${formatCurrency(Number(estimatedCrewCosts.dailyTotal || 0))}/day`,
      qualityRating: clampScore(Number(territory.locationMatch?.score || 65)) / 20,
      specialties: specialties.length ? specialties : ['General production crew'],
      tradeoff: toArray<string>(territory.cons).length
        ? toArray<string>(territory.cons).join(' • ')
        : 'Balanced option for cost, logistics, and incentives.',
    };
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
    tone: metadata.targetAudience || 'Production-ready with balanced commercial and creative intent',
    scale: `${productionDetails.format || metadata.format || 'feature'} • ${productionDetails.crewSize || metadata.crewSize || 'medium'} crew`,
    complexity: complexityFromDays(shootingDays),
    executiveSummary: reportData.executiveSummary ?? null,
    financialAnalysis: reportData.financialAnalysis ?? null,
    sectionExplainers: reportData.sectionExplainers ?? null,
    locationRankings,
    incentiveEstimates,
    crewInsights,
    comparables,
    weatherLogistics,
    fundingOpportunities,
    scriptTitle: reportData.scriptTitle || metadata.title,
    generatedAt: reportData.generatedAt || report?.completed_at || new Date().toISOString(),
  };
}

function buildPreviewAnalysis(metadata: ScriptMetadata): ScriptAnalysis {
  const now = new Date().toISOString();
  const primaryTerritory = metadata.country || 'uk';

  return {
    genre: metadata.genre.length ? metadata.genre.join(', ') : 'Drama',
    tone: metadata.targetAudience || 'Preview estimate based on supplied production metadata',
    scale: `${metadata.format || 'Feature Film'} • ${metadata.budgetCurrency} ${metadata.budgetAmount || 'budget TBD'}`,
    complexity: 'Medium',
    locationRankings: [
      {
        name: primaryTerritory.toUpperCase(),
        country: primaryTerritory.toUpperCase(),
        score: 72,
        costEfficiency: 68,
        crewDepth: 70,
        infrastructure: 74,
        incentiveStrength: 69,
        currencyAdvantage: 62,
        reasoning: [
          'Preview mode: estimated from your selected metadata.',
          'Full analysis unlocks scene-level matching and territory scoring.',
        ],
        isAssessmentOnly: true,
      },
    ],
    incentiveEstimates: [
      {
        territory: primaryTerritory.toUpperCase(),
        program: 'Preview incentive estimate',
        rate: 'Est. 20-30%',
        cap: 'Varies',
        qualifyingSpend: 'Program dependent',
        estimatedRebate: 'Unlock full report',
        requirements: ['Eligibility must be validated against local program rules.'],
        disclaimer: 'Preview estimate only.',
        dataSource: 'Prodculator preview model',
        lastUpdated: now,
      },
    ],
    crewInsights: [
      {
        territory: primaryTerritory.toUpperCase(),
        availability: 'Medium',
        costVsUSD: 'Preview estimate',
        qualityRating: 3.5,
        specialties: ['General production crew'],
        tradeoff: 'Upgrade for full crew-cost and role-by-role detail.',
      },
    ],
    comparables: [],
    weatherLogistics: [
      {
        territory: primaryTerritory.toUpperCase(),
        bestMonths: ['Apr', 'May', 'Sep', 'Oct'],
        weatherRisk: 'Medium',
        infrastructure: 'Preview estimate',
        travelVisa: 'Check local visa and permit requirements.',
      },
    ],
    fundingOpportunities: [],
    scriptTitle: metadata.title,
    generatedAt: now,
  };
}

export function ScriptProvider({ children }: { children: ReactNode }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pollReportStatus = async (reportId: string): Promise<ReportStatusResponse> => {
    const timeoutMs = 180000;
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
        ? { ...analysisData, id: report.id, scriptTitle: metadata.title, generatedAt: report.completed_at || new Date().toISOString() }
        : mapReportToAnalysis(report, metadata);
      setAnalysis(mapped);
      return mapped;
    } finally {
      setIsProcessing(false);
    }
  };

  // Preview calls POST /api/reports with report_type "preview" — synchronous, no auth needed.
  const generatePreview = async (metadata: ScriptMetadata): Promise<ScriptAnalysis> => {
    setIsProcessing(true);

    try {
      const body = buildReportRequestBody(metadata, 'preview');
      const response = await apiClient.post<{ reportType: string; analysis: ScriptAnalysis }>(
        '/api/reports',
        body
      );

      const analysisData: ScriptAnalysis = {
        ...response.analysis,
        scriptTitle: metadata.title,
        generatedAt: new Date().toISOString(),
      };
      setAnalysis(analysisData);
      return analysisData;
    } catch (err) {
      // Fall back to local preview if backend preview fails
      const fallback = buildPreviewAnalysis(metadata);
      setAnalysis(fallback);
      return fallback;
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
  CrewInsight,
  ComparableProduction,
  WeatherLogistics,
  FundingOpportunity,
  ScriptMetadata,
  ActionTimelineItem,
  FinancialScenario,
};
