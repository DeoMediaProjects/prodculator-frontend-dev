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

// ── Crew Costs ────────────────────────────────────────────────────────────────
export interface CrewRate {
  id: string;
  // Legacy fields (may be null for newer records)
  territory: string | null;
  category: string | null;
  dayRate: number | null;
  weekRate: number | null;
  union: string | null;
  lastUpdated: string | null;
  source: string | null;
  currency: string | null;
  // Core fields always present
  role: string;
  createdAt: string | null;
  updatedAt: string | null;
  // New structured fields from API
  country: string;
  region: string;
  roleCategory: string;
  department: string;
  unionRateCents: number;
  nonUnionRateCents: number;
  rateCurrency: string;
  workingDayHours: number;
  fringeRatePct: number;
  fringeDescription: string | null;
  sourceName: string;
  sourceUrl: string | null;
  sourceType: string;
  confidenceScore: number;
  effectiveFrom: string | null;
  notes: string | null;
  budgetBand: string | null;
  rateNotes: string | null;
  lastVerifiedAt: string | null;
}

// ── Sync System (shared by incentives & crew costs) ──────────────────────────
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
  status: 'opening-soon' | 'open' | 'closing-soon' | 'closed';
  daysUntilDeadline: number;
  eligibility: string[];
  websiteUrl: string;
  dataSource: 'manual' | 'rss' | 'api' | 'scrape';
  verified: boolean;
  isNew: boolean;
  createdAt: string;
  updatedAt: string;
  lastVerifiedAt?: string;
}

// Payload for creating a grant — backend sets id, createdAt, updatedAt
export type CreateGrantPayload = Omit<Grant, 'id' | 'createdAt' | 'updatedAt'>;

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
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  last_checked: string;
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
}
