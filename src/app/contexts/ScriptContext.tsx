import { createContext, useContext, useState, ReactNode } from 'react';
import { apiClient } from '@/services/api';
import { authService } from '@/services/auth.service';
import { databaseService } from '@/services/database.service';

import type {
  ActionTimelineItem,
  ComparableProduction,
  FinancialScenario,
  FundingOpportunity,
  IncentiveEstimate,
  LocationRanking,
  ScriptAnalysis,
  ScriptMetadata,
  WeatherLogistics,
} from './report.types';
import {
  buildReportRequestBody,
  mapReportToAnalysis,
  normaliseAnalysisData,
  optionalScore,
} from './reportMapping';

export { mapReportToAnalysis, optionalScore };

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


export function ScriptProvider({ children }: { children: ReactNode }) {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ScriptAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const pollReportStatus = async (reportId: string): Promise<ReportStatusResponse> => {
    // Generation typically takes 2–4 minutes, so the timeout must comfortably
    // exceed that — a 60s window meant every normal report hit the timeout and
    // got bounced to the dashboard. Poll a little more often so we navigate to
    // the finished report promptly once it's ready.
    const timeoutMs = 360000; // 6 minutes
    const pollIntervalMs = 2500;
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
