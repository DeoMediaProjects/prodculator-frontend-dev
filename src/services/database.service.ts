/**
 * Backend Database Service
 * Uses backend API endpoints instead of direct database access.
 */

import { apiClient } from './api';
import type { Festival } from '@/app/types/festival';

export interface Report {
  id: string;
  user_id: string;
  script_title: string;
  status: 'processing' | 'completed' | 'failed';
  report_type: 'free' | 'paid' | 'b2b';
  report_data?: any;
  pdf_url?: string;
  created_at: string;
  completed_at?: string;
}

export interface Subscription {
  id: string;
  user_id: string;
  status: string;
  plan_type?: 'free' | 'single' | 'studio';
  report_limit?: number;
  current_period_start?: string;
  current_period_end?: string;
  created_at?: string;
}

export interface GrantOpportunity {
  id: string;
  title: string;
  description?: string;
  territory: string;
  deadline?: string;
  amount?: string;
  website_url?: string;
}


export class DatabaseService {
  async createReport(
    _userId: string,
    scriptFile: File,
    metadata: Record<string, unknown>
  ): Promise<{ reportId: string; error: string | null }> {
    try {
      const form = new FormData();
      form.append('script_file', scriptFile);
      form.append('body', JSON.stringify(metadata));

      const data = await apiClient.upload<{ report_id: string }>('/api/reports', form, { auth: true });
      return { reportId: data.report_id, error: null };
    } catch (error) {
      return { reportId: '', error: error instanceof Error ? error.message : 'Failed to create report' };
    }
  }

  async completeReport(_reportId: string, _reportData: any, _pdfUrl: string): Promise<{ error: string | null }> {
    return { error: 'Report completion is managed by backend background processing.' };
  }

  async failReport(_reportId: string, _errorMessage: string): Promise<{ error: string | null }> {
    return { error: 'Report failure state is managed by backend background processing.' };
  }

  async getReport(reportId: string): Promise<{ report: Report | null; error: string | null }> {
    try {
      const report = await apiClient.get<Report>(`/api/reports/${reportId}`, { auth: true });
      return { report, error: null };
    } catch (error) {
      return { report: null, error: error instanceof Error ? error.message : 'Failed to fetch report' };
    }
  }

  async getReportPdfUrl(reportId: string): Promise<{ pdfUrl: string | null; error: string | null }> {
    try {
      const data = await apiClient.get<{ pdf_url: string }>(`/api/reports/${reportId}/pdf`, { auth: true });
      return { pdfUrl: data.pdf_url, error: null };
    } catch (error) {
      return { pdfUrl: null, error: error instanceof Error ? error.message : 'Failed to fetch PDF URL' };
    }
  }

  async getReportByShareToken(shareToken: string): Promise<{ report: Report | null; error: string | null }> {
    try {
      const report = await apiClient.get<Report>(`/api/reports/shared/${shareToken}`);
      return { report, error: null };
    } catch (error) {
      return { report: null, error: error instanceof Error ? error.message : 'Failed to fetch report' };
    }
  }

  async getUserReports(_userId: string): Promise<{ reports: Report[]; error: string | null }> {
    try {
      const reports = await apiClient.get<Report[]>('/api/reports', { auth: true });
      return { reports, error: null };
    } catch (error) {
      return { reports: [], error: error instanceof Error ? error.message : 'Failed to fetch reports' };
    }
  }

  async getActiveSubscription(_userId: string): Promise<{ subscription: Subscription | null; error: string | null }> {
    try {
      const data = await apiClient.get<{ subscription: Subscription | null }>('/api/subscriptions/active', { auth: true });
      return { subscription: data.subscription, error: null };
    } catch (error) {
      return { subscription: null, error: error instanceof Error ? error.message : 'Failed to fetch subscription' };
    }
  }

  async canGenerateReport(_userId: string): Promise<{ canGenerate: boolean; reason: string }> {
    try {
      const data = await apiClient.get<{ can_generate: boolean; reason: string }>('/api/subscriptions/can-generate', { auth: true });
      return { canGenerate: data.can_generate, reason: data.reason };
    } catch (_error) {
      // Fail open: if the check endpoint is unreachable, let the backend
      // enforce at report creation time rather than silently blocking the user.
      return { canGenerate: true, reason: '' };
    }
  }

  async getAllGrants(): Promise<{ grants: GrantOpportunity[]; error: string | null }> {
    try {
      const grants = await apiClient.get<GrantOpportunity[]>('/api/grants');
      return { grants, error: null };
    } catch (error) {
      return { grants: [], error: error instanceof Error ? error.message : 'Failed to fetch grants' };
    }
  }

  async getGrantsByTerritory(territory: string): Promise<{ grants: GrantOpportunity[]; error: string | null }> {
    try {
      const grants = await apiClient.get<GrantOpportunity[]>(`/api/grants?territory=${encodeURIComponent(territory)}`);
      return { grants, error: null };
    } catch (error) {
      return { grants: [], error: error instanceof Error ? error.message : 'Failed to fetch grants' };
    }
  }

  async createGrant(_grant: Omit<GrantOpportunity, 'id'>): Promise<{ error: string | null }> {
    return { error: 'Grant creation moved to admin API endpoints.' };
  }

  async updateGrant(_grantId: string, _updates: Partial<GrantOpportunity>): Promise<{ error: string | null }> {
    return { error: 'Grant updates moved to admin API endpoints.' };
  }

  async deleteGrant(_grantId: string): Promise<{ error: string | null }> {
    return { error: 'Grant deletion moved to admin API endpoints.' };
  }

  async getAllFestivals(): Promise<{ festivals: Festival[]; error: string | null }> {
    try {
      const data = await apiClient.get<{ items: Festival[] } | Festival[]>('/api/festivals');
      const festivals = Array.isArray(data) ? data : data.items;
      return { festivals, error: null };
    } catch (error) {
      return { festivals: [], error: error instanceof Error ? error.message : 'Failed to fetch festivals' };
    }
  }

  async createFestival(_festival: Omit<Festival, 'id'>): Promise<{ error: string | null }> {
    return { error: 'Festival creation moved to admin API endpoints.' };
  }

  async updateFestival(_festivalId: string, _updates: Partial<Festival>): Promise<{ error: string | null }> {
    return { error: 'Festival updates moved to admin API endpoints.' };
  }

  async deleteFestival(_festivalId: string): Promise<{ error: string | null }> {
    return { error: 'Festival deletion moved to admin API endpoints.' };
  }

  async addToWatchlist(_userId: string, territory: string): Promise<{ error: string | null }> {
    try {
      await apiClient.post('/api/watchlist', { territory }, { auth: true });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to add to watchlist' };
    }
  }

  async removeFromWatchlist(_userId: string, territory: string): Promise<{ error: string | null }> {
    try {
      await apiClient.delete(`/api/watchlist?territory=${encodeURIComponent(territory)}`, { auth: true });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Failed to remove from watchlist' };
    }
  }

  async getWatchlist(_userId: string): Promise<{ territories: string[]; error: string | null }> {
    try {
      const data = await apiClient.get<{ territories: string[] }>('/api/watchlist', { auth: true });
      return { territories: data.territories, error: null };
    } catch (error) {
      return { territories: [], error: error instanceof Error ? error.message : 'Failed to fetch watchlist' };
    }
  }

  async hasUsedFreeReport(_email: string): Promise<boolean> {
    try {
      const reports = await apiClient.get<Report[]>('/api/reports', { auth: true });
      return reports.length > 0;
    } catch (_error) {
      return false;
    }
  }

  async getAllReports(limit = 50, offset = 0): Promise<{ reports: Report[]; total: number; error: string | null }> {
    try {
      const data = await apiClient.get<{ items: Report[]; total: number }>(`/api/admin/reports?limit=${limit}&offset=${offset}`, { auth: true });
      return { reports: data.items, total: data.total, error: null };
    } catch (error) {
      return { reports: [], total: 0, error: error instanceof Error ? error.message : 'Failed to fetch reports' };
    }
  }

  async getAllUsers(limit = 50, offset = 0): Promise<{ users: any[]; total: number; error: string | null }> {
    try {
      const data = await apiClient.get<{ items: any[]; total: number }>(`/api/admin/users?limit=${limit}&offset=${offset}`, { auth: true });
      return { users: data.items, total: data.total, error: null };
    } catch (error) {
      return { users: [], total: 0, error: error instanceof Error ? error.message : 'Failed to fetch users' };
    }
  }

  async getBusinessMetrics(): Promise<{ metrics: any; error: string | null }> {
    try {
      const metrics = await apiClient.get<any>('/api/admin/metrics', { auth: true });
      return { metrics, error: null };
    } catch (error) {
      return { metrics: null, error: error instanceof Error ? error.message : 'Failed to fetch business metrics' };
    }
  }

  async downloadScript(_path: string): Promise<{ text: string; error: string | null }> {
    return { text: '', error: 'Script download handled by backend report workflow.' };
  }

  async uploadPDFReport(_reportId: string, _pdfBlob: Blob): Promise<{ url: string; error: string | null }> {
    return { url: '', error: 'PDF generation and upload handled by backend.' };
  }
}

export const databaseService = new DatabaseService();
