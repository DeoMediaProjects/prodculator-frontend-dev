// ── Shared pagination wrapper ──────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

// ── Metrics (matches /api/admin/metrics response) ─────────────────────────────
export interface AdminMetrics {
  total_users: number;
  active_subscriptions: number;
  total_reports: number;
  reports_this_month: number;
  mrr_usd: number;
  /** How many active subscriptions were valued at plan list price because no
   *  amount was recorded on the row. Non-zero means the figure is partly imputed
   *  and must not be presented as billed. */
  mrr_estimated_subscriptions?: number;
  conversion_rate_percent: number;
}

// ── Business Metrics dashboard (matches /api/admin/business-metrics response) ──
export interface CurrencyAmount {
  currency: string;
  amount: number;
}

export interface PlanCount {
  plan: string;
  count: number;
}

export interface RoleCount {
  role: string;
  count: number;
}

export interface GeoCountry {
  country_code: string;
  country: string;
  users: number;
  percentage: number;
  revenue_usd: number;
}

export interface GeoState {
  state_code: string;
  state: string;
  users: number;
  revenue_usd: number;
}

export interface BusinessMetricsDashboard {
  total_users: number;
  total_paid_users: number;
  active_subscriptions: number;
  mrr_usd: number;
  arr_usd: number;
  /** How many active subscriptions were valued at plan list price because no
   *  amount was recorded on the row. Non-zero means the MRR figure is partly
   *  imputed and must not be presented as billed. */
  mrr_estimated_subscriptions?: number;
  mrr_by_currency: CurrencyAmount[];
  monthly_churn_percent: number;
  free_to_paid_percent: number;
  avg_days_to_convert: number | null;
  activation_rate_percent: number;
  plan_distribution: PlanCount[];
  role_distribution: RoleCount[];
  geo_available: boolean;
  geographic: GeoCountry[];
  us_states: GeoState[];
}

// ── Production Intelligence ──────────────────────────────────────────────────
export type ProductionScaleBand = 'small' | 'medium' | 'large' | 'extra_large';
export type ProductionCameraEquipment =
  | 'arri'
  | 'red'
  | 'sony'
  | 'panavision'
  | 'blackmagic'
  | 'canon'
  | 'other';

export interface ProductionSignal {
  id: string;
  scriptId: string;
  territory: string;
  state?: string;
  submissionDate: string;
  cameraEquipment?: ProductionCameraEquipment;
  crewSize?: ProductionScaleBand;
  principalCast?: ProductionScaleBand;
  supportingCast?: ProductionScaleBand;
  backgroundExtras?: ProductionScaleBand;
  budgetRange?: string;
  format?: string;
  genres?: string[];
}

export interface ProductionSignalsResponse {
  items: ProductionSignal[];
  total: number;
}

// ── Incentives ────────────────────────────────────────────────────────────────
export interface IncentiveData {
  id?: string;
  territory: string;
  program: string;
  rate: string;
  cap: string;
  lastUpdated: string | null;
  status: string;
  sourceUrl: string | null;
  autoSyncEnabled: boolean;
  lastAutoCheck?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  // v4 source-of-truth fields (all optional — returned by the admin API)
  region?: string | null;
  rateGross?: number | null;
  rateNet?: number | null;
  rateType?: string | null;
  rateGrossDisplay?: string | null;
  rateNetDisplay?: string | null;
  rebateCapDisplay?: string | null;
  perPersonCapDisplay?: string | null;
  annualProgrammeCap?: string | null;
  budgetEligibilityCeiling?: string | null;
  mechanismPattern?: string | null;
  verificationStatus?: string | null;
  confidence?: number | null;
  bankPts?: number | null;
  qsBasis?: string | null;
  calcFormula?: string | null;
  regionalFundsNote?: string | null;
  capType?: string | null;
  paymentTimeline?: string | null;
  notes?: string | null;
  aiRule?: string | null;
  authority?: string | null;
  warningsJson?: string | null;
  qualifyingSpendType?: string | null;
  qualifyingSpendCapPct?: number | null;
  qualifyingSpendMin?: number | null;
  qualifyingSpendCurrency?: string | null;
  atl_exempt?: boolean | null;
  is_supplementary?: boolean | null;
  payment_reliability?: number | null;
  lastVerifiedAt?: string | null;
  /**
   * Internal data-audit trail (PROD-FIX-006). Admin-only — this is the sole
   * field that may carry QA annotations, and the report generator cannot read
   * it. Never render this in client-facing output.
   */
  internalAuditNotes?: string | null;
}

export interface IncentiveCalcRequest {
  budgetAmount: number;
  budgetCurrency: string;
  territory: string;
  program: string;
}

export interface IncentiveCalcResult {
  territory: string;
  program: string;
  status: string;
  available: boolean;
  refusalReason?: string | null;
  programmeNote?: string | null;
  switchedProgramme?: string | null;
  mechanismPattern?: string | null;
  budgetEligibilityCeiling?: string | null;
  rateGrossDisplay?: string | null;
  rateNetDisplay?: string | null;
  fxNote?: string | null;
  currency?: string;
  budget?: string | null;
  qualifyingSpend?: string | null;
  netQualifyingSpend?: string | null;
  qualifyingSpendPct?: string | null;
  grossRebate?: string | null;
  netRebate?: string | null;
  netBudget?: string | null;
  rateGross?: string | null;
  rateNet?: string | null;
  notes?: string[];
  qsBasis?: string | null;
  calcFormula?: string | null;
}

export interface PendingChange {
  id: string;
  territory: string;
  field: string;
  currentValue: string | null;
  detectedValue: string;
  confidence: 'high' | 'medium' | 'low';
  source: string | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string | null;
  resourceId: string | null;
  resolvedAt: string | null;
}


// ── Territory Profiles (Crew Depth + Bankability) ────────────────────────────
export interface TerritoryProfileData {
  id?: string;
  territory: string;
  isoCode?: string | null;
  region?: string | null;
  hemisphere?: string | null;
  crewDepthTier?: string | null;
  crewDepthScore?: number | null;
  crewDepthNotes?: string | null;
  infrastructureTier?: string | null;
  infrastructureScore?: number | null;
  infrastructureNotes?: string | null;
  certWeeksMin?: number | null;
  certWeeksMax?: number | null;
  paymentWeeksMin?: number | null;
  paymentWeeksMax?: number | null;
  bankabilitySourceQuality?: string | null;
  bankabilitySourceNote?: string | null;
  bankabilityRealWorldConfirms?: boolean | null;
  bankabilitySuspended?: boolean | null;
  bankabilitySourceUrl?: string | null;
  bankabilityAiRule?: string | null;
  lastReviewedAt?: string | null;
  reviewedBy?: string | null;
  reviewNotes?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ── Sync System (shared by incentives etc.) ──────────────────────────────────
export interface SyncStatus {
  territoriesSyncing: number;
  pendingChanges: number;
  daysSinceLastCheck: number;
  nextScheduledCheck: string | null;
}

export interface SyncSettings {
  schedule: 'monthly' | 'quarterly' | 'biannual' | 'annual' | null;
  enabled: boolean;
  lastSyncAt: string | null;
  nextScheduledCheck: string | null;
}

export interface SyncSettingsUpdate {
  schedule?: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  enabled?: boolean;
}

export interface SyncTriggerResponse {
  status: 'sync_triggered';
  lastSyncAt: string;
}

// ── Comparable Productions ────────────────────────────────────────────────────
export interface ComparableProduction {
  id: string;
  title: string;
  year: number;
  genre: string | string[];
  budget: number;
  territory: string;
  incentiveUsed: string;
  tmdbId?: string;
  source: string;
  lastUpdated: string;
}

export interface TmdbSyncResponse {
  message: string;
  imported: number;
  skipped: number;
  total: number;
}

// ── Grants ────────────────────────────────────────────────────────────────────
export interface Grant {
  id: string;
  title: string;
  territory: string;
  fundingBody: string;
  maxAmount: string;
  currency: string;
  applicationOpens: string;
  applicationDeadline: string;
  // Backend uses underscores (opening_soon); legacy hyphens tolerated on read
  status: 'opening_soon' | 'open' | 'closing_soon' | 'closed' | string;
  daysUntilDeadline: number | null;
  eligibility: string[];
  websiteUrl: string;
  dataSource: string;
  verified: boolean;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string | null;
  // Structured v2 fields (all served by the API; blank = not stated, never inferred)
  continent?: string | null;
  eligible_formats?: string[] | null;
  genre_tags?: string[] | null;
  grant_type?: string | null;
  recurrence?: string | null;
  nationality_required?: boolean | null;
  co_production_required?: boolean | null;
  productionStage?: string | null;
  emergingFilmmaker?: boolean | null;
  budget_min_usd?: number | null;
  budget_max_usd?: number | null;
  amount_usd_approx?: number | null;
}

// Payload for creating a grant — backend sets id, createdAt, updatedAt
export type CreateGrantPayload = Partial<Grant> & { title: string; territory: string };

// Response from bulk import
export interface BulkImportResult {
  imported: number;
  failed: number;
  errors: { row: number; reason: string }[];
}

// ── Subscribers ──────────────────────────────────────────────────────────────
export interface SubscriberMetrics {
  total_paid_users: number;
  mrr_usd: number;
  mrr_gbp: number;
  reports_this_month_total: number;
  reports_this_month_free: number;
  reports_this_month_paid: number;
  avg_reports_per_user: number;
  plan_distribution: PlanDistributionEntry[];
}

export interface PlanDistributionEntry {
  plan: string;
  user_count: number;
  revenue: number;
}

export interface Subscriber {
  id: string;
  name: string;
  email: string;
  company: string;
  plan: string;
  status: string;
  reports_this_month: number;
  report_limit: number | null;
  monthly_spend: number;
  /** True when no amount was billed on the subscription and the plan's list
   *  price stood in, so the figure must not be presented as billed. */
  monthly_spend_estimated?: boolean;
  payment_currency: 'USD' | 'GBP';
  join_date: string;
  last_active: string | null;
  total_reports_generated: number;
}

export interface SubscriberListResponse extends PaginatedResponse<Subscriber> {
  counts: {
    active: number;
    past_due: number;
    canceled: number;
  };
}

export interface CreditAdjustment {
  adjustment: number;
  reason?: string;
}

export interface CreditAdjustmentResponse {
  id: string;
  credits_remaining: number;
}

// ── Data Sources ─────────────────────────────────────────────────────────────
export type DataSourceStatus = 'unknown' | 'connected' | 'disconnected';
export type DataSourceCredentialMode = 'backend_env' | (string & {});
export type DataSourceSyncSchedule =
  | 'on-demand'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'semi_annual'
  | 'annual'
  | null;

export interface DataSource {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  endpoint: string;
  enabled: boolean;
  status: DataSourceStatus;
  credential_mode: DataSourceCredentialMode;
  credential_configured: boolean;
  is_implemented: boolean;
  last_tested_at: string | null;
  last_test_result: string | null;
  last_test_message: string | null;
  sync_schedule: DataSourceSyncSchedule;
  updated_at: string | null;
}

export interface DataSourceUpdate {
  enabled?: boolean;
  sync_schedule?: DataSourceSyncSchedule;
}

export interface DataSourceTestResult {
  slug: string;
  status: Exclude<DataSourceStatus, 'unknown'>;
  latency_ms: number;
  message: string;
  tested_at: string;
}

export interface DataSourceBulkSavePayload {
  sources: { id: string; enabled: boolean }[];
}

export interface DataSourceBulkSaveResponse {
  updated: number;
}

export interface SyncScheduleItem {
  slug: string;
  name: string;
  sync_schedule: DataSourceSyncSchedule;
  last_tested_at: string | null;
  enabled: boolean;
}

export interface SyncScheduleResponse {
  items: SyncScheduleItem[];
}

// ── Email Gating ─────────────────────────────────────────────────────────────
export interface EmailGatingRecord {
  id: string;
  email: string;
  date: string;
  report_generated: boolean;
  blocked: boolean;
}

// ── Audit trail (handoff §4.4/§4.5) ──────────────────────────────────────────

/** One recorded admin mutation. Read-only: nothing accepts this as input. */
export interface AuditLogEntry {
  id: string;
  /** Null only when a request never resolved an admin (a rejected call). */
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  /** Stable `verb.resource` string, e.g. "update.incentive". */
  action: string;
  resource_type: string;
  resource_id: string | null;
  /** Resource state either side of the change, redacted for secrets. */
  before_json: unknown;
  after_json: unknown;
  method: string | null;
  path: string | null;
  status_code: number | null;
  ip_address: string | null;
  user_agent: string | null;
  error_message: string | null;
  created_at: string | null;
  /** Derived server-side from status_code. Null when no response was recorded. */
  succeeded: boolean | null;
}

export interface AuditLogFilters {
  limit?: number;
  offset?: number;
  actor_id?: string;
  actor_email?: string;
  action?: string;
  resource_type?: string;
  resource_id?: string;
  /** 'success' is 2xx/3xx, 'failed' is 4xx/5xx. Omit for both. */
  status?: 'success' | 'failed';
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface AuditLogActorFacet {
  actor_id: string | null;
  actor_email: string | null;
  count: number;
}

/** Filter values actually present in the trail, so the UI offers real options. */
export interface AuditLogFacets {
  actors: AuditLogActorFacet[];
  actions: string[];
  resource_types: string[];
}

export interface AuditRetention {
  retention_days: number;
  retains_indefinitely: boolean;
  total_entries: number;
  failed_entries: number;
  oldest_entry_at: string | null;
  newest_entry_at: string | null;
}

// ── PDF Reports ──────────────────────────────────────────────────────────────
export interface PdfReport {
  id: string;
  title: string;
  email: string;
  generated: string;
  downloaded: boolean;
  size: string;
}

export interface PdfReportPreviewResponse {
  url: string;
}

export interface ResendReportResponse {
  success: boolean;
  message: string;
}

// ── Admin User Management ────────────────────────────────────────────────────
export type AdminRoleValue = 'master_admin' | 'senior_admin' | 'data_admin' | 'support_admin';

export interface AdminUserRecord {
  id: string;
  email: string;
  name: string;
  role: AdminRoleValue;
  last_login: string | null;
  created_at: string;
}

export interface CreateAdminPayload {
  email: string;
  name?: string;
  role: AdminRoleValue;
}

export interface CreateAdminResponse {
  admin: AdminUserRecord;
  temporary_password: string;
}

export interface UpdateAdminPayload {
  name?: string;
  email?: string;
  role?: AdminRoleValue;
  password?: string;
}

// Festival is defined in src/app/types/festival.ts — import from there directly.

// ── Admin Overview — Activity feed ────────────────────────────────────────────
export interface ActivityItem {
  id: string;
  type: 'report_generated' | 'user_registered' | 'subscription_activated';
  description: string;
  user_email: string | null;
  timestamp: string | null;
}

export interface ActivityResponse {
  items: ActivityItem[];
}

// ── Admin Overview — System status ────────────────────────────────────────────
export interface ServiceStatusItem {
  name: string;
  /** operational/degraded/down come from a live probe; configured/not_configured
   *  from inspecting credentials only. `unknown` is legacy and no longer sent. */
  status: 'operational' | 'degraded' | 'down' | 'configured' | 'not_configured' | 'unknown';
  /** What the row is based on. 'live' means a probe ran during the request;
   *  'configuration' means only credential presence was read. The UI must show
   *  this, or a config row reads as a health result. */
  check?: 'live' | 'configuration';
  /** One line on what was measured, e.g. "PING acknowledged". */
  detail?: string | null;
  /** Null on configuration rows — nothing was checked, so there is no time at
   *  which it was checked. */
  last_checked?: string | null;
}

export interface SystemStatusResponse {
  services: ServiceStatusItem[];
  checked_at: string;
}

// ── Admin Overview — Derived tasks ────────────────────────────────────────────
export interface TaskItem {
  task: string;
  priority: 'high' | 'medium' | 'low';
  due: string;
}

export interface TasksResponse {
  items: TaskItem[];
}

// ── Territories ───────────────────────────────────────────────────────────────
/** One item from GET /api/territories */
export interface Territory {
  /** Canonical display name, e.g. "United Kingdom" */
  label: string;
  /** ISO 3166-1 alpha-2 code, e.g. "GB" */
  iso: string;
  /** Parent country label for sub-territories, otherwise null */
  parent: string | null;
  /** true for states / regions / devolved nations */
  isSubTerritory: boolean;
  /** false when the platform knows the territory but has no active incentive
   *  for it today (suspended, absent, or pending verification). These are
   *  selectable at intake but excluded from rebate rankings. */
  hasActiveIncentive?: boolean;
}
