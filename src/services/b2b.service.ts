import { apiClient, apiFetch } from './api';

export type B2BProductType =
  | 'camera_equipment'
  | 'production_services'
  | 'crew_casting'
  | 'production_trend'
  | 'enterprise';

export type B2BCurrency = 'gbp' | 'usd';
export type B2BDeliveryFrequency = 'monthly' | 'quarterly';

// ── Package composer ────────────────────────────────────────────────────────

/** One entry in the section catalogue. `part` splits the two dataset families:
 *  "context" is curated market data, "signals" is aggregated platform data. */
export interface PackageSection {
  key: string;
  title: string;
  part: 'context' | 'signals';
  group: string;
  kind: string;
  note?: string | null;
  source?: string | null;
}

export interface PackagePreviewPayload {
  section_keys: string[];
  period_start: string;
  period_end: string;
  /** Scopes the exclusivity check, so blocked sections surface at preview time. */
  subscription_id?: string | null;
}

/** Per-section sufficiency verdict. `renderable` is the only field that decides
 *  whether a section will appear in the PDF. */
export interface PackagePreviewSection {
  key: string;
  title?: string;
  part?: 'context' | 'signals';
  status:
    | 'ok'
    | 'below_threshold'
    | 'insufficient_overall'
    | 'empty_dataset'
    | 'blocked_exclusive'
    | 'unknown';
  renderable: boolean;
  qualifying_segments?: number;
  suppressed_segments?: number;
  record_count?: number;
  source?: string | null;
  exclusivity?: {
    held_by_subscription_id?: string;
    reverts_at?: string | null;
    module_label?: string | null;
  };
}

export interface PackagePreview {
  period_start: string;
  period_end: string;
  signal_count: number;
  overall_threshold_met: boolean;
  thresholds: {
    minimum_overall_records: number;
    minimum_segment_records: number;
  };
  sections: PackagePreviewSection[];
  renderable_sections: number;
}

export interface PackageGeneratePayload {
  section_keys: string[];
  period_start: string;
  period_end: string;
  title: string;
  subscription_id?: string | null;
  /** Off by default: an admin iterating on a composition must not email the
   *  client on every generate. */
  deliver?: boolean;
}

export interface SavedPackageTemplate {
  id: string;
  name: string;
  description?: string | null;
  section_keys: string[];
  product_type?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  section_titles?: string[];
  /** Keys a later deploy removed from the library; shown as a warning. */
  unknown_section_keys?: string[];
}

export interface SaveTemplatePayload {
  name: string;
  section_keys: string[];
  description?: string | null;
  product_type?: string | null;
  template_id?: string | null;
}

// ── Signal pool governance ──────────────────────────────────────────────────

export interface SignalPoolSummary {
  total: number;
  consented: number;
  not_consented: number;
  internal: number;
  /** The count that actually reaches a report: consented AND not internal. */
  eligible: number;
  excluded: number;
  excluded_reasons: { no_consent: number; internal: number };
  period_start: string | null;
  period_end: string | null;
}

export interface SignalPoolItem {
  id: string;
  script_id?: string | null;
  submission_date?: string | null;
  territory?: string | null;
  home_country?: string | null;
  format?: string | null;
  b2b_consent: boolean;
  is_internal: boolean;
  eligible: boolean;
}

export interface SignalPoolPage {
  total: number;
  limit: number;
  offset: number;
  items: SignalPoolItem[];
}

export interface SignalPoolQuery {
  periodStart?: string;
  periodEnd?: string;
  consent?: boolean;
  internal?: boolean;
  limit?: number;
  offset?: number;
}

export interface B2BProduct {
  product_type: B2BProductType;
  title: string;
  audience: string;
  description: string;
  features: string[];
  price_gbp_cents: number | null;
  price_usd_cents: number | null;
  self_service: boolean;
  /** "coming_soon" while pricing is being finalised, "custom_contract" for
   *  bespoke agreements, "listed" once a real price is published. */
  pricing_status?: 'coming_soon' | 'custom_contract' | 'listed';
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
  /** Resolved from the account on the admin listing, so the console can name the
   *  client instead of printing a bare UUID. Absent on single-row responses. */
  user_email?: string | null;
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

// ── Manual-contract invites (handoff §4.3/§4.4) ─────────────────────────────
// An invite lets an admin act on a signed contract before the client has an
// account: the subscription is created when the client claims it, not up front.

export type B2BInviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface AdminB2BInvitePayload {
  email: string;
  product_type: B2BProductType;
  delivery_frequency: B2BDeliveryFrequency;
  extra_recipient_email?: string | null;
  company_name?: string | null;
  admin_notes?: string | null;
  expires_in_days?: number;
  /** Off when the admin will pass the link on themselves. */
  send_email?: boolean;
}

export interface AdminB2BInvite {
  id: string;
  email: string;
  product_type: B2BProductType;
  /** `expired` is derived from expires_at server-side, never stored. */
  status: B2BInviteStatus;
  /** First few characters of the token, enough to tell two invites apart and
   *  not enough to reconstruct a link. */
  token_prefix: string | null;
  expires_at: string | null;
  delivery_frequency: string | null;
  extra_recipient_email: string | null;
  company_name: string | null;
  admin_notes: string | null;
  created_by: string | null;
  sent_count: number;
  last_sent_at: string | null;
  accepted_at: string | null;
  accepted_by_user_id: string | null;
  b2b_subscription_id: string | null;
  revoked_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** The only response that carries the accept URL. The raw token is not stored,
 *  so this link cannot be recovered later; resending mints a new one. */
export interface AdminB2BInviteIssued {
  invite: AdminB2BInvite;
  accept_url: string;
}

/** Unauthenticated view of an invite, for the accept page. */
export interface B2BInvitePreview {
  email: string;
  product_type: B2BProductType;
  company_name: string | null;
  delivery_frequency: string | null;
  expires_at: string | null;
  status: B2BInviteStatus;
  claimable: boolean;
}

/** What a client may receive for a product, and what exclusivity withholds. */
export interface B2BWithheldSection {
  section_key: string;
  section_title: string;
  module_label: string | null;
  /** Null means the exclusivity is perpetual, not that it is unknown. */
  available_from: string | null;
}

export interface B2BRequestEntitlement {
  product_type: string;
  section_keys: string[];
  allowed_section_keys: string[];
  withheld_sections: B2BWithheldSection[];
  /** False only when exclusivity leaves nothing renderable at all. */
  can_request: boolean;
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
    downloadPdf(
      `/api/b2b/requests/${request.id}/pdf`,
      `Business Intelligence - ${request.product_type} - ${request.period_start} to ${request.period_end}.pdf`,
    ),
  updateRecipients: (subscriptionId: string, extraRecipientEmail: string | null) =>
    apiClient.patch<B2BSubscription>(
      `/api/b2b/subscriptions/${subscriptionId}/recipients`,
      { extra_recipient_email: extraRecipientEmail },
      { auth: true },
    ),

  /** What this client may request for a product. The console reads this to
   *  disable withheld sections up front, so exclusivity reads as a stated
   *  constraint with a reversion date rather than a refusal after the fact. */
  getRequestEntitlement: (productType: string) =>
    apiClient.get<B2BRequestEntitlement>(
      `/api/b2b/requests/entitlement?product_type=${encodeURIComponent(productType)}`,
      { auth: true },
    ),

  // ── Manual-contract invite claim ──────────────────────────────────────────
  /** Unauthenticated on purpose: the client may not have an account yet, and
   *  needs to see what they are claiming before creating one. */
  previewInvite: (token: string) =>
    apiClient.get<B2BInvitePreview>(`/api/b2b/invites/${encodeURIComponent(token)}`),
  acceptInvite: (token: string) =>
    apiClient.post<B2BSubscription>(
      `/api/b2b/invites/${encodeURIComponent(token)}/accept`, {}, { auth: true },
    ),
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

  // ── Manual-contract invites ───────────────────────────────────────────────
  getInvites: async (params: { status?: B2BInviteStatus; email?: string } = {}) => {
    const qs = new URLSearchParams({ limit: '200' });
    if (params.status) qs.set('status', params.status);
    if (params.email) qs.set('email', params.email);
    const response = await apiClient.get<ListResponse<AdminB2BInvite>>(
      `/api/admin/b2b/invites?${qs.toString()}`, { auth: true },
    );
    return response.items;
  },
  issueInvite: (payload: AdminB2BInvitePayload) =>
    apiClient.post<AdminB2BInviteIssued>('/api/admin/b2b/invites', payload, { auth: true }),
  /** Rotates the token, which invalidates the previous link — the reason an
   *  admin resends is usually that the first link went somewhere it shouldn't. */
  resendInvite: (id: string) =>
    apiClient.post<AdminB2BInviteIssued>(`/api/admin/b2b/invites/${id}/resend`, {}, { auth: true }),
  revokeInvite: (id: string) =>
    apiClient.post<AdminB2BInvite>(`/api/admin/b2b/invites/${id}/revoke`, {}, { auth: true }),
  getRequests: async () => {
    const response = await apiClient.get<ListResponse<B2BIntelligenceRequest>>('/api/admin/b2b/requests', { auth: true });
    return response.items;
  },
  resendRequest: (id: string) =>
    apiClient.post<{ sent: boolean; recipients: string[] }>(`/api/admin/b2b/requests/${id}/resend`, {}, { auth: true }),
  downloadRequestPdf: (request: B2BIntelligenceRequest) =>
    downloadPdf(`/api/admin/b2b/requests/${request.id}/pdf`, `B2B Intelligence - ${request.product_type}.pdf`),

  // ── Package composer ──────────────────────────────────────────────────────
  getSectionLibrary: async () => {
    const res = await apiClient.get<{ sections: PackageSection[] }>(
      '/api/admin/b2b/package/library', { auth: true },
    );
    return res.sections;
  },
  getProductTemplate: (productType: string) =>
    apiClient.get<{ product_type: string; section_keys: string[] }>(
      `/api/admin/b2b/package/template/${productType}`, { auth: true },
    ),
  previewPackage: (payload: PackagePreviewPayload) =>
    apiClient.post<PackagePreview>('/api/admin/b2b/package/preview', payload, { auth: true }),
  generatePackage: (payload: PackageGeneratePayload) =>
    apiClient.post<{ request_id: string; status: string }>(
      '/api/admin/b2b/package/generate', payload, { auth: true },
    ),

  // ── Saved templates ───────────────────────────────────────────────────────
  getSavedTemplates: async (productType?: string) => {
    const qs = productType ? `?product_type=${encodeURIComponent(productType)}` : '';
    const res = await apiClient.get<{ templates: SavedPackageTemplate[] }>(
      `/api/admin/b2b/package/templates${qs}`, { auth: true },
    );
    return res.templates;
  },
  saveTemplate: (payload: SaveTemplatePayload) =>
    apiClient.post<SavedPackageTemplate>('/api/admin/b2b/package/templates', payload, { auth: true }),
  deleteTemplate: (id: string) =>
    apiClient.delete<{ deleted: boolean }>(`/api/admin/b2b/package/templates/${id}`, { auth: true }),

  // ── Signal pool governance ────────────────────────────────────────────────
  getSignalPoolSummary: (periodStart?: string, periodEnd?: string) => {
    const qs = new URLSearchParams();
    if (periodStart) qs.set('period_start', periodStart);
    if (periodEnd) qs.set('period_end', periodEnd);
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiClient.get<SignalPoolSummary>(
      `/api/admin/b2b/signal-pool/summary${suffix}`, { auth: true },
    );
  },
  getSignalPool: (params: SignalPoolQuery = {}) => {
    const qs = new URLSearchParams();
    if (params.periodStart) qs.set('period_start', params.periodStart);
    if (params.periodEnd) qs.set('period_end', params.periodEnd);
    if (params.consent !== undefined) qs.set('consent', String(params.consent));
    if (params.internal !== undefined) qs.set('internal', String(params.internal));
    qs.set('limit', String(params.limit ?? 100));
    qs.set('offset', String(params.offset ?? 0));
    return apiClient.get<SignalPoolPage>(`/api/admin/b2b/signal-pool?${qs}`, { auth: true });
  },
  // b2b_consent may only be sent as false. The API rejects a grant with 422:
  // consent is the producer's to give, so an admin can honour a revocation but
  // never manufacture one.
  updateSignalFlags: (id: string, payload: { is_internal?: boolean; b2b_consent?: false }) =>
    apiClient.patch<{ id: string; b2b_consent: boolean; is_internal: boolean }>(
      `/api/admin/b2b/signal-pool/${id}`, payload, { auth: true },
    ),
};

