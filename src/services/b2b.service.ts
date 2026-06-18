import { apiClient, apiFetch } from './api';

export type B2BProductType =
  | 'camera_equipment'
  | 'production_services'
  | 'crew_casting'
  | 'production_trend'
  | 'enterprise';

export type B2BCurrency = 'gbp' | 'usd';
export type B2BDeliveryFrequency = 'monthly' | 'quarterly';

export interface B2BProduct {
  product_type: B2BProductType;
  title: string;
  audience: string;
  description: string;
  features: string[];
  price_gbp_cents: number | null;
  price_usd_cents: number | null;
  self_service: boolean;
  stripe_price_configured: Record<string, boolean>;
}

export interface B2BSubscription {
  id: string;
  user_id: string;
  product_type: B2BProductType;
  status: string;
  source: string;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  price_id?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  delivery_frequency: B2BDeliveryFrequency | string;
  extra_recipient_email?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_delivery_at?: string | null;
  cancel_at_period_end: boolean;
  company_name?: string | null;
  admin_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface B2BIntelligenceRequest {
  id: string;
  user_id: string;
  b2b_subscription_id?: string | null;
  product_type: B2BProductType;
  status: string;
  request_type: string;
  period_start: string;
  period_end: string;
  recipient_email: string;
  extra_recipient_email?: string | null;
  pdf_url?: string | null;
  download_url?: string | null;
  metrics?: Record<string, unknown> | null;
  error_message?: string | null;
  delivered_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ListResponse<T> {
  items: T[];
  total?: number;
}

export interface B2BCheckoutPayload {
  product_type: B2BProductType;
  currency: B2BCurrency;
  delivery_frequency: B2BDeliveryFrequency;
  extra_recipient_email?: string | null;
}

export interface B2BRequestPayload {
  product_type: B2BProductType;
  period_start: string;
  period_end: string;
  extra_recipient_email?: string | null;
}

export interface AdminB2BSubscriptionUpdate {
  status?: string;
  delivery_frequency?: B2BDeliveryFrequency;
  extra_recipient_email?: string | null;
  next_delivery_at?: string | null;
  company_name?: string | null;
  admin_notes?: string | null;
}

export interface AdminB2BManualSubscriptionPayload {
  user_email: string;
  product_type: B2BProductType;
  delivery_frequency: B2BDeliveryFrequency;
  extra_recipient_email?: string | null;
  status?: string;
  company_name?: string | null;
  admin_notes?: string | null;
}

async function downloadPdf(path: string, filename: string) {
  const response = await apiFetch(path);
  if (!response.ok) {
    throw new Error(`Download failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export const b2bService = {
  getProducts: () => apiClient.get<B2BProduct[]>('/api/b2b/products', { auth: true }),
  getSubscriptions: async () => {
    const response = await apiClient.get<ListResponse<B2BSubscription>>('/api/b2b/subscriptions', { auth: true });
    return response.items;
  },
  createCheckout: (payload: B2BCheckoutPayload) =>
    apiClient.post<{ session_id: string; url: string }>('/api/b2b/checkout', payload, { auth: true }),
  createRequest: (payload: B2BRequestPayload) =>
    apiClient.post<B2BIntelligenceRequest>('/api/b2b/requests', payload, { auth: true }),
  getRequests: async () => {
    const response = await apiClient.get<ListResponse<B2BIntelligenceRequest>>('/api/b2b/requests', { auth: true });
    return response.items;
  },
  downloadRequestPdf: (request: B2BIntelligenceRequest) =>
    downloadPdf(`/api/b2b/requests/${request.id}/pdf`, `B2B Intelligence - ${request.product_type}.pdf`),
};

export const adminB2BService = {
  getSubscriptions: async () => {
    const response = await apiClient.get<ListResponse<B2BSubscription>>('/api/admin/b2b/subscriptions', { auth: true });
    return response.items;
  },
  createManualSubscription: (payload: AdminB2BManualSubscriptionPayload) =>
    apiClient.post<B2BSubscription>('/api/admin/b2b/subscriptions', payload, { auth: true }),
  updateSubscription: (id: string, payload: AdminB2BSubscriptionUpdate) =>
    apiClient.patch<B2BSubscription>(`/api/admin/b2b/subscriptions/${id}`, payload, { auth: true }),
  getRequests: async () => {
    const response = await apiClient.get<ListResponse<B2BIntelligenceRequest>>('/api/admin/b2b/requests', { auth: true });
    return response.items;
  },
  resendRequest: (id: string) =>
    apiClient.post<{ sent: boolean; recipients: string[] }>(`/api/admin/b2b/requests/${id}/resend`, {}, { auth: true }),
  downloadRequestPdf: (request: B2BIntelligenceRequest) =>
    downloadPdf(`/api/admin/b2b/requests/${request.id}/pdf`, `B2B Intelligence - ${request.product_type}.pdf`),
};

