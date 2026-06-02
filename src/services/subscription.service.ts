/**
 * Native subscription change/preview client.
 *
 * Existing subscribers go through these endpoints — never createSubscriptionCheckout,
 * which is reserved for first-time signups.
 */

import { apiClient } from './api';

export type ChangeDirection = 'upgrade' | 'downgrade' | 'same';

export interface SubscriptionRecord {
  id?: string;
  user_id?: string;
  status?: string;
  stripe_subscription_id?: string;
  stripe_customer_id?: string;
  plan_type?: string;
  pending_plan?: string | null;
  past_due_since?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  [key: string]: unknown;
}

export interface CurrentSubscriptionResponse {
  subscription: SubscriptionRecord | null;
  plan: string;
  pending_plan: string | null;
  past_due_since: string | null;
  cancel_at_period_end: boolean;
}

export interface PreviewChangeResponse {
  direction: ChangeDirection;
  target_plan: string;
  immediate_total: number;
  proration_credit: number;
  next_invoice_total: number;
  currency: string;
  effective_date: string | null;
  billing_cycle_changes: boolean;
}

export interface ChangePlanResponse {
  status: 'applied' | 'scheduled';
  direction: ChangeDirection;
  target_plan: string;
  effective_at: string | null;
}

export async function getCurrentSubscription(): Promise<CurrentSubscriptionResponse> {
  return apiClient.get<CurrentSubscriptionResponse>('/api/subscriptions/current', { auth: true });
}

export async function previewPlanChange(targetPriceId: string): Promise<PreviewChangeResponse> {
  return apiClient.post<PreviewChangeResponse>(
    '/api/subscriptions/preview-change',
    { target_price_id: targetPriceId },
    { auth: true },
  );
}

export async function changePlan(
  targetPriceId: string,
  idempotencyKey: string,
): Promise<ChangePlanResponse> {
  return apiClient.post<ChangePlanResponse>(
    '/api/subscriptions/change',
    { target_price_id: targetPriceId, idempotency_key: idempotencyKey },
    { auth: true },
  );
}

export async function cancelScheduledChange(): Promise<{ cancelled: boolean }> {
  return apiClient.delete<{ cancelled: boolean }>(
    '/api/subscriptions/scheduled-change',
    { auth: true },
  );
}

export default {
  getCurrentSubscription,
  previewPlanChange,
  changePlan,
  cancelScheduledChange,
};
