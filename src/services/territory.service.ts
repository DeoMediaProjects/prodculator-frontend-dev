/**
 * Territory Comparison Service
 * Calls GET /api/territories and GET /api/territories/compare
 */
import { apiClient } from './api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface TerritoryListItem {
  label: string;
  iso: string;
  parent: string | null;
  isSubTerritory: boolean;
}

export interface IncentiveInfo {
  programme: string;
  tax_rebate: string;
  rate_gross: number | null;
  rate_net: number | null;
  rate_type: string | null;
  post_production_bonus: string | null;
  min_spend: string | null;
  min_spend_raw: number | null;
  min_spend_currency: string | null;
  cap_display: string | null;
  payment_timeline: string | null;
  payment_timeline_days_min: number | null;
  payment_timeline_days_max: number | null;
  eligibility_rules: string[];
  warnings: string[];
  last_verified: string | null;
  expiry_date: string | null;
}

export interface CrewCostInfo {
  avg_day_rate: number | null;
  avg_day_rate_display: string | null;
  currency: string;
  sample_roles: Record<string, string>;
}

export interface TerritoryCompareItem {
  label: string;
  iso: string;
  level: 'national' | 'regional';
  parent: string | null;
  incentive: IncentiveInfo | null;
  crew_costs: CrewCostInfo | null;
  labor_requirement: string | null;
  highlights: string[];
  restrictions: string[];
  currency: string;
}

export interface TerritoryCompareResponse {
  territories: TerritoryCompareItem[];
  available_territories: TerritoryListItem[];
}

export interface TerritoryListResponse {
  territories: TerritoryListItem[];
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function fetchTerritoryList(): Promise<{
  data: TerritoryListResponse | null;
  error: string | null;
}> {
  try {
    const raw = await apiClient.get<TerritoryListResponse>('/api/territories');
    // Normalise: backend returns { territories: [...] } but guard against
    // the response being an array directly or missing the key entirely.
    const territories: TerritoryListItem[] = Array.isArray(raw)
      ? (raw as unknown as TerritoryListItem[])
      : Array.isArray((raw as TerritoryListResponse)?.territories)
        ? (raw as TerritoryListResponse).territories
        : [];
    return { data: { territories }, error: null };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch territories';
    return { data: null, error: message };
  }
}

export async function compareTerritories(
  territories: string[],
  currency: string = 'GBP',
): Promise<{ data: TerritoryCompareResponse | null; error: string | null }> {
  try {
    const params = new URLSearchParams({
      territories: territories.join(','),
      currency,
    });
    const raw = await apiClient.get<TerritoryCompareResponse>(
      `/api/territories/compare?${params.toString()}`,
      { auth: true },
    );
    // Normalise shape defensively
    const resp = raw as TerritoryCompareResponse;
    return {
      data: {
        territories: Array.isArray(resp?.territories) ? resp.territories : [],
        available_territories: Array.isArray(resp?.available_territories)
          ? resp.available_territories
          : [],
      },
      error: null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to compare territories';
    return { data: null, error: message };
  }
}
