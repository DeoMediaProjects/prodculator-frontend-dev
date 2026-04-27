/**
 * What-If Calculator Service
 * Calls POST /api/calculator/scenario to compute territory comparisons.
 */

import { apiClient } from './api';

// ── Request ────────────────────────────────────────────────────────────────────

export interface ScenarioRequest {
  budget_amount: number;
  budget_currency: string;
  vfx_pct: number;
  production_format: string | null;
  production_priority: 'incentive' | 'full' | 'location';
  territories?: string[] | null;
  baseline?: 'GB' | 'US';
}

// ── Response ───────────────────────────────────────────────────────────────────

export interface TerritoryScenario {
  territory: string;
  iso: string | null;
  programme: string;
  rate_display: string;
  rate_gross: number | null;
  rate_net: number | null;
  rate_type: string | null;
  estimated_rebate: number;
  estimated_rebate_display: string;
  qualifying_spend: number;
  qualifying_spend_display: string;
  qualifying_spend_pct: number;
  atl_deduction: number | null;
  atl_deduction_display: string | null;
  currency_advantage_score: number;
  currency_advantage_warning: string | null;
  territory_currency: string;
  fx_rate: number | null;
  fx_rate_date: string | null;
  crew_cost_index: number | null;
  crew_rates: Record<string, string>;
  net_saving: number;
  net_saving_display: string;
  payment_timeline: string | null;
  min_spend: string | null;
  cap: string | null;
  eligibility_note: string | null;
  programme_note: string | null;
  overall_score: number;
  vfx_uplift_rate: number | null;
  vfx_uplift_programme: string | null;
  vfx_uplift_value: number | null;
  vfx_uplift_display: string | null;
}

export interface ScenarioResponse {
  budget_amount: number;
  budget_currency: string;
  budget_gbp: number;
  vfx_pct: number;
  production_format: string | null;
  production_priority: string;
  fx_rates_date: string | null;
  territories: TerritoryScenario[];
}

// ── API call ───────────────────────────────────────────────────────────────────

export async function computeScenario(
  request: ScenarioRequest,
): Promise<{ data: ScenarioResponse | null; error: string | null }> {
  try {
    const data = await apiClient.post<ScenarioResponse>(
      '/api/calculator/scenario',
      request,
    );
    return { data, error: null };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Scenario computation failed';
    return { data: null, error: message };
  }
}
