import { apiClient } from './api';
import {
  ADMIN_ADMIN_USERS_URL,
  adminAdminUserUrl,
  ADMIN_METRICS_URL,
  ADMIN_BUSINESS_METRICS_URL,
  ADMIN_PRODUCTION_SIGNALS_URL,
  ADMIN_INCENTIVES_URL,
  adminIncentiveUrl,
  ADMIN_CREW_COSTS_URL,
  adminCrewCostUrl,
  ADMIN_COMPARABLES_URL,
  ADMIN_COMPARABLES_SYNC_TMDB_URL,
  adminComparableUrl,
  ADMIN_GRANTS_URL,
  ADMIN_GRANTS_BULK_IMPORT_URL,
  ADMIN_GRANTS_SYNC_URL,
  ADMIN_GRANTS_SYNC_STATUS_URL,
  ADMIN_GRANTS_PENDING_CHANGES_URL,
  adminGrantPendingChangeApproveUrl,
  adminGrantPendingChangeRejectUrl,
  ADMIN_GRANTS_SYNC_SETTINGS_URL,
  adminGrantUrl,
  ADMIN_FESTIVALS_URL,
  ADMIN_FESTIVALS_SYNC_URL,
  ADMIN_FESTIVALS_SYNC_STATUS_URL,
  ADMIN_FESTIVALS_PENDING_CHANGES_URL,
  adminFestivalPendingChangeApproveUrl,
  adminFestivalPendingChangeRejectUrl,
  ADMIN_FESTIVALS_SYNC_SETTINGS_URL,
  adminFestivalUrl,
  ADMIN_DATA_SOURCES_URL,
  adminDataSourceUrl,
  adminDataSourceTestUrl,
  ADMIN_DATA_SOURCES_CONFIGURATION_URL,
  ADMIN_DATA_SOURCES_SYNC_SCHEDULE_URL,
  ADMIN_INCENTIVES_SYNC_STATUS_URL,
  ADMIN_INCENTIVES_PENDING_CHANGES_URL,
  adminIncentivePendingChangeApproveUrl,
  adminIncentivePendingChangeRejectUrl,
  ADMIN_INCENTIVES_SYNC_URL,
  ADMIN_INCENTIVES_SYNC_SETTINGS_URL,
  ADMIN_CREW_COSTS_SYNC_STATUS_URL,
  ADMIN_CREW_COSTS_PENDING_CHANGES_URL,
  adminCrewCostPendingChangeApproveUrl,
  adminCrewCostPendingChangeRejectUrl,
  ADMIN_CREW_COSTS_SYNC_URL,
  ADMIN_CREW_COSTS_SYNC_SETTINGS_URL,
  ADMIN_SUBSCRIBERS_URL,
  ADMIN_SUBSCRIBERS_METRICS_URL,
  adminSubscriberBlockUrl,
  adminSubscriberUnblockUrl,
  adminSubscriberCreditUrl,
  ADMIN_EMAIL_GATING_URL,
  adminEmailGatingBlockUrl,
  adminEmailGatingUnblockUrl,
  ADMIN_PDF_REPORTS_URL,
  adminPdfReportPreviewUrl,
  adminPdfReportDownloadUrl,
  adminPdfReportResendUrl,
  ADMIN_ACTIVITY_URL,
  ADMIN_SYSTEM_STATUS_URL,
  ADMIN_TASKS_URL,
} from './admin.apiurl';
import type {
  AdminMetrics,
  BusinessMetricsDashboard,
  ProductionSignal,
  ProductionSignalsResponse,
  IncentiveData,
  CrewRate,
  ComparableProduction,
  Grant,
  CreateGrantPayload,
  BulkImportResult,
  PaginatedResponse,
  SyncStatus,
  PendingChange,
  SyncSettings,
  SyncSettingsUpdate,
  SyncTriggerResponse,
  SubscriberMetrics,
  SubscriberListResponse,
  CreditAdjustment,
  CreditAdjustmentResponse,
  TmdbSyncResponse,
  DataSource,
  DataSourceUpdate,
  DataSourceTestResult,
  DataSourceBulkSavePayload,
  DataSourceBulkSaveResponse,
  SyncScheduleResponse,
  EmailGatingRecord,
  PdfReport,
  PdfReportPreviewResponse,
  ResendReportResponse,
  AdminUserRecord,
  CreateAdminPayload,
  CreateAdminResponse,
  UpdateAdminPayload,
  ActivityResponse,
  SystemStatusResponse,
  TasksResponse,
} from './admin.types';
import type { Festival } from '@/app/types/festival';

// ── Shared result type ─────────────────────────────────────────────────────────
type ApiResult<T> = Promise<{ data: T | null; error: string | null }>;

function paginationQuery(limit = 50, offset = 0) {
  return `?limit=${limit}&offset=${offset}`;
}

type ProductionSignalScale = ProductionSignal['crewSize'];
type RawProductionSignalsResponse = {
  items?: Array<Record<string, unknown>>;
  total?: number;
};

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function toStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value
      .map((entry) => toStringOrUndefined(entry))
      .filter((entry): entry is string => Boolean(entry));
    return items.length ? items : undefined;
  }
  const asString = toStringOrUndefined(value);
  if (!asString) return undefined;
  const parts = asString
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

function normalizeScaleBand(value: unknown): ProductionSignalScale | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 10) return 'small';
    if (value <= 50) return 'medium';
    if (value <= 100) return 'large';
    return 'extra_large';
  }

  const raw = toStringOrUndefined(value)?.toLowerCase();
  if (!raw) return undefined;

  if (raw === 'small' || raw === 'medium' || raw === 'large' || raw === 'extra_large') {
    return raw;
  }
  if (raw.includes('extra') || raw.includes('xl') || raw.includes('100+')) return 'extra_large';
  if (raw.includes('large')) return 'large';
  if (raw.includes('medium')) return 'medium';
  if (raw.includes('small')) return 'small';

  const parsed = Number(raw);
  if (Number.isFinite(parsed)) return normalizeScaleBand(parsed);
  return undefined;
}

function normalizeCameraEquipment(value: unknown): ProductionSignal['cameraEquipment'] {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const raw = toStringOrUndefined(rawValue)?.toLowerCase();
  if (!raw) return undefined;
  if (raw.includes('arri')) return 'arri';
  if (raw.includes('red')) return 'red';
  if (raw.includes('sony')) return 'sony';
  if (raw.includes('panavision')) return 'panavision';
  if (raw.includes('blackmagic')) return 'blackmagic';
  if (raw.includes('canon')) return 'canon';
  return 'other';
}

function mapProductionSignal(item: Record<string, unknown>): ProductionSignal {
  return {
    id: toStringOrUndefined(item.id) ?? '',
    scriptId: toStringOrUndefined(item.script_id) ?? toStringOrUndefined(item.id) ?? '',
    territory: toStringOrUndefined(item.territory) ?? 'Unknown',
    state: toStringOrUndefined(item.state),
    submissionDate: toStringOrUndefined(item.submission_date) ?? '',
    cameraEquipment: normalizeCameraEquipment(item.camera_equipment),
    crewSize: normalizeScaleBand(item.crew_size),
    principalCast: normalizeScaleBand(item.principal_cast),
    supportingCast: normalizeScaleBand(item.supporting_cast),
    backgroundExtras: normalizeScaleBand(item.background_extras),
    budgetRange: toStringOrUndefined(item.budget_range),
    format: toStringOrUndefined(item.format),
    genres: toStringArray(item.genres),
  };
}

// ── Metrics ───────────────────────────────────────────────────────────────────
async function getMetrics(signal?: AbortSignal): ApiResult<AdminMetrics> {
  try {
    const data = await apiClient.get<AdminMetrics>(ADMIN_METRICS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch metrics' };
  }
}

// ── Business Metrics dashboard ────────────────────────────────────────────────
async function getBusinessMetrics(signal?: AbortSignal): ApiResult<BusinessMetricsDashboard> {
  try {
    const data = await apiClient.get<BusinessMetricsDashboard>(ADMIN_BUSINESS_METRICS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch business metrics' };
  }
}

// ── Production Signals ────────────────────────────────────────────────────────
async function getProductionSignals(
  territory?: string,
  startDate?: string,
  endDate?: string,
  signal?: AbortSignal,
): ApiResult<ProductionSignalsResponse> {
  try {
    const query = new URLSearchParams();
    if (territory) query.set('territory', territory);
    if (startDate) query.set('start_date', startDate);
    if (endDate) query.set('end_date', endDate);

    const queryString = query.toString();
    const url = queryString
      ? `${ADMIN_PRODUCTION_SIGNALS_URL}?${queryString}`
      : ADMIN_PRODUCTION_SIGNALS_URL;

    const response = await apiClient.get<RawProductionSignalsResponse>(url, { auth: true, signal });
    const items = (response.items ?? []).map(mapProductionSignal);

    return {
      data: {
        items,
        total: typeof response.total === 'number' ? response.total : items.length,
      },
      error: null,
    };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch production signals' };
  }
}

// ── Incentives ────────────────────────────────────────────────────────────────
async function getIncentives(limit = 50, offset = 0, signal?: AbortSignal): ApiResult<PaginatedResponse<IncentiveData>> {
  try {
    const data = await apiClient.get<PaginatedResponse<IncentiveData>>(
      `${ADMIN_INCENTIVES_URL}${paginationQuery(limit, offset)}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch incentives' };
  }
}

async function createIncentive(payload: IncentiveData): ApiResult<IncentiveData> {
  try {
    const data = await apiClient.post<IncentiveData>(ADMIN_INCENTIVES_URL, { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to create incentive' };
  }
}

async function updateIncentive(id: string, payload: IncentiveData): ApiResult<IncentiveData> {
  try {
    const data = await apiClient.patch<IncentiveData>(adminIncentiveUrl(id), { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update incentive' };
  }
}

async function deleteIncentive(id: string): ApiResult<void> {
  try {
    await apiClient.delete(adminIncentiveUrl(id), { auth: true });
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to delete incentive' };
  }
}

// ── Crew Costs ────────────────────────────────────────────────────────────────
async function getCrewRates(limit = 50, offset = 0, signal?: AbortSignal): ApiResult<PaginatedResponse<CrewRate>> {
  try {
    const data = await apiClient.get<PaginatedResponse<CrewRate>>(
      `${ADMIN_CREW_COSTS_URL}${paginationQuery(limit, offset)}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch crew rates' };
  }
}

async function createCrewRate(payload: CrewRate): ApiResult<CrewRate> {
  try {
    const data = await apiClient.post<CrewRate>(ADMIN_CREW_COSTS_URL, { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to create crew rate' };
  }
}

async function updateCrewRate(id: string, payload: CrewRate): ApiResult<CrewRate> {
  try {
    const data = await apiClient.patch<CrewRate>(adminCrewCostUrl(id), { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update crew rate' };
  }
}

async function deleteCrewRate(id: string): ApiResult<void> {
  try {
    await apiClient.delete(adminCrewCostUrl(id), { auth: true });
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to delete crew rate' };
  }
}

// ── Incentive Sync ───────────────────────────────────────────────────────────
async function getIncentiveSyncStatus(signal?: AbortSignal): ApiResult<SyncStatus> {
  try {
    const data = await apiClient.get<SyncStatus>(ADMIN_INCENTIVES_SYNC_STATUS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch incentive sync status' };
  }
}

async function getIncentivePendingChanges(signal?: AbortSignal): ApiResult<PendingChange[]> {
  try {
    const data = await apiClient.get<PendingChange[]>(ADMIN_INCENTIVES_PENDING_CHANGES_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch incentive pending changes' };
  }
}

async function approveIncentivePendingChange(changeId: string): ApiResult<PendingChange> {
  try {
    const data = await apiClient.post<PendingChange>(adminIncentivePendingChangeApproveUrl(changeId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to approve pending change' };
  }
}

async function rejectIncentivePendingChange(changeId: string): ApiResult<PendingChange> {
  try {
    const data = await apiClient.post<PendingChange>(adminIncentivePendingChangeRejectUrl(changeId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to reject pending change' };
  }
}

async function triggerIncentiveSync(): ApiResult<SyncTriggerResponse> {
  try {
    const data = await apiClient.post<SyncTriggerResponse>(ADMIN_INCENTIVES_SYNC_URL, {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to trigger incentive sync' };
  }
}

async function getIncentiveSyncSettings(signal?: AbortSignal): ApiResult<SyncSettings> {
  try {
    const data = await apiClient.get<SyncSettings>(ADMIN_INCENTIVES_SYNC_SETTINGS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch incentive sync settings' };
  }
}

async function updateIncentiveSyncSettings(payload: SyncSettingsUpdate): ApiResult<SyncSettings> {
  try {
    const data = await apiClient.patch<SyncSettings>(ADMIN_INCENTIVES_SYNC_SETTINGS_URL, payload, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update incentive sync settings' };
  }
}

// ── Crew Cost Sync ───────────────────────────────────────────────────────────
async function getCrewCostSyncStatus(signal?: AbortSignal): ApiResult<SyncStatus> {
  try {
    const data = await apiClient.get<SyncStatus>(ADMIN_CREW_COSTS_SYNC_STATUS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch crew cost sync status' };
  }
}

async function getCrewCostPendingChanges(signal?: AbortSignal): ApiResult<PendingChange[]> {
  try {
    const data = await apiClient.get<PendingChange[]>(ADMIN_CREW_COSTS_PENDING_CHANGES_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch crew cost pending changes' };
  }
}

async function approveCrewCostPendingChange(changeId: string): ApiResult<PendingChange> {
  try {
    const data = await apiClient.post<PendingChange>(adminCrewCostPendingChangeApproveUrl(changeId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to approve pending change' };
  }
}

async function rejectCrewCostPendingChange(changeId: string): ApiResult<PendingChange> {
  try {
    const data = await apiClient.post<PendingChange>(adminCrewCostPendingChangeRejectUrl(changeId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to reject pending change' };
  }
}

async function triggerCrewCostSync(): ApiResult<SyncTriggerResponse> {
  try {
    const data = await apiClient.post<SyncTriggerResponse>(ADMIN_CREW_COSTS_SYNC_URL, {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to trigger crew cost sync' };
  }
}

async function getCrewCostSyncSettings(signal?: AbortSignal): ApiResult<SyncSettings> {
  try {
    const data = await apiClient.get<SyncSettings>(ADMIN_CREW_COSTS_SYNC_SETTINGS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch crew cost sync settings' };
  }
}

async function updateCrewCostSyncSettings(payload: SyncSettingsUpdate): ApiResult<SyncSettings> {
  try {
    const data = await apiClient.patch<SyncSettings>(ADMIN_CREW_COSTS_SYNC_SETTINGS_URL, payload, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update crew cost sync settings' };
  }
}

// ── Comparables ───────────────────────────────────────────────────────────────
async function getComparables(limit = 50, offset = 0, signal?: AbortSignal): ApiResult<PaginatedResponse<ComparableProduction>> {
  try {
    const data = await apiClient.get<PaginatedResponse<ComparableProduction>>(
      `${ADMIN_COMPARABLES_URL}${paginationQuery(limit, offset)}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch comparables' };
  }
}

async function createComparable(payload: ComparableProduction): ApiResult<ComparableProduction> {
  try {
    const data = await apiClient.post<ComparableProduction>(ADMIN_COMPARABLES_URL, { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to create comparable' };
  }
}

async function updateComparable(id: string, payload: ComparableProduction): ApiResult<ComparableProduction> {
  try {
    const data = await apiClient.patch<ComparableProduction>(adminComparableUrl(id), { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update comparable' };
  }
}

async function deleteComparable(id: string): ApiResult<void> {
  try {
    await apiClient.delete(adminComparableUrl(id), { auth: true });
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to delete comparable' };
  }
}

async function syncComparablesTMDB(): ApiResult<TmdbSyncResponse> {
  try {
    const data = await apiClient.post<TmdbSyncResponse>(ADMIN_COMPARABLES_SYNC_TMDB_URL, {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to sync from TMDB' };
  }
}

// ── Grants ────────────────────────────────────────────────────────────────────
async function getGrants(limit = 50, offset = 0, signal?: AbortSignal): ApiResult<PaginatedResponse<Grant>> {
  try {
    const data = await apiClient.get<PaginatedResponse<Grant>>(
      `${ADMIN_GRANTS_URL}${paginationQuery(limit, offset)}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch grants' };
  }
}

async function createGrant(payload: CreateGrantPayload): ApiResult<Grant> {
  try {
    const data = await apiClient.post<Grant>(ADMIN_GRANTS_URL, { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to create grant' };
  }
}

async function bulkImportGrants(file: File): ApiResult<BulkImportResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const data = await apiClient.upload<BulkImportResult>(ADMIN_GRANTS_BULK_IMPORT_URL, formData, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to import grants' };
  }
}

async function updateGrant(id: string, payload: Partial<Grant>): ApiResult<Grant> {
  try {
    const data = await apiClient.patch<Grant>(adminGrantUrl(id), { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update grant' };
  }
}

async function deleteGrant(id: string): ApiResult<void> {
  try {
    await apiClient.delete(adminGrantUrl(id), { auth: true });
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to delete grant' };
  }
}

async function triggerGrantSync(): ApiResult<SyncTriggerResponse> {
  try {
    const data = await apiClient.post<SyncTriggerResponse>(ADMIN_GRANTS_SYNC_URL, {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to trigger grants sync' };
  }
}

async function getGrantSyncStatus(signal?: AbortSignal): ApiResult<SyncStatus> {
  try {
    const data = await apiClient.get<SyncStatus>(ADMIN_GRANTS_SYNC_STATUS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch grants sync status' };
  }
}

async function getGrantPendingChanges(signal?: AbortSignal): ApiResult<PendingChange[]> {
  try {
    const data = await apiClient.get<PendingChange[]>(ADMIN_GRANTS_PENDING_CHANGES_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch grants pending changes' };
  }
}

async function approveGrantPendingChange(changeId: string): ApiResult<PendingChange> {
  try {
    const data = await apiClient.post<PendingChange>(adminGrantPendingChangeApproveUrl(changeId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to approve grant pending change' };
  }
}

async function rejectGrantPendingChange(changeId: string): ApiResult<PendingChange> {
  try {
    const data = await apiClient.post<PendingChange>(adminGrantPendingChangeRejectUrl(changeId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to reject grant pending change' };
  }
}

async function getGrantSyncSettings(signal?: AbortSignal): ApiResult<SyncSettings> {
  try {
    const data = await apiClient.get<SyncSettings>(ADMIN_GRANTS_SYNC_SETTINGS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch grants sync settings' };
  }
}

async function updateGrantSyncSettings(payload: SyncSettingsUpdate): ApiResult<SyncSettings> {
  try {
    const data = await apiClient.patch<SyncSettings>(ADMIN_GRANTS_SYNC_SETTINGS_URL, payload, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update grants sync settings' };
  }
}

// ── Festivals ─────────────────────────────────────────────────────────────────
async function getFestivals(limit = 50, offset = 0, signal?: AbortSignal): ApiResult<PaginatedResponse<Festival>> {
  try {
    const data = await apiClient.get<PaginatedResponse<Festival>>(
      `${ADMIN_FESTIVALS_URL}${paginationQuery(limit, offset)}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch festivals' };
  }
}

async function createFestival(payload: Festival): ApiResult<Festival> {
  try {
    const data = await apiClient.post<Festival>(ADMIN_FESTIVALS_URL, { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to create festival' };
  }
}

async function updateFestival(id: string, payload: Festival): ApiResult<Festival> {
  try {
    const data = await apiClient.patch<Festival>(adminFestivalUrl(id), { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update festival' };
  }
}

async function deleteFestival(id: string): ApiResult<void> {
  try {
    await apiClient.delete(adminFestivalUrl(id), { auth: true });
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to delete festival' };
  }
}

async function triggerFestivalSync(): ApiResult<SyncTriggerResponse> {
  try {
    const data = await apiClient.post<SyncTriggerResponse>(ADMIN_FESTIVALS_SYNC_URL, {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to trigger festival sync' };
  }
}

async function getFestivalSyncStatus(signal?: AbortSignal): ApiResult<SyncStatus> {
  try {
    const data = await apiClient.get<SyncStatus>(ADMIN_FESTIVALS_SYNC_STATUS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch festival sync status' };
  }
}

async function getFestivalPendingChanges(signal?: AbortSignal): ApiResult<PendingChange[]> {
  try {
    const data = await apiClient.get<PendingChange[]>(ADMIN_FESTIVALS_PENDING_CHANGES_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch festival pending changes' };
  }
}

async function approveFestivalPendingChange(changeId: string): ApiResult<PendingChange> {
  try {
    const data = await apiClient.post<PendingChange>(adminFestivalPendingChangeApproveUrl(changeId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to approve festival pending change' };
  }
}

async function rejectFestivalPendingChange(changeId: string): ApiResult<PendingChange> {
  try {
    const data = await apiClient.post<PendingChange>(adminFestivalPendingChangeRejectUrl(changeId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to reject festival pending change' };
  }
}

async function getFestivalSyncSettings(signal?: AbortSignal): ApiResult<SyncSettings> {
  try {
    const data = await apiClient.get<SyncSettings>(ADMIN_FESTIVALS_SYNC_SETTINGS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch festival sync settings' };
  }
}

async function updateFestivalSyncSettings(payload: SyncSettingsUpdate): ApiResult<SyncSettings> {
  try {
    const data = await apiClient.patch<SyncSettings>(ADMIN_FESTIVALS_SYNC_SETTINGS_URL, payload, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update festival sync settings' };
  }
}

// ── Data Sources ─────────────────────────────────────────────────────────────
async function getDataSources(limit = 50, offset = 0, signal?: AbortSignal): ApiResult<PaginatedResponse<DataSource>> {
  try {
    const data = await apiClient.get<PaginatedResponse<DataSource>>(
      `${ADMIN_DATA_SOURCES_URL}${paginationQuery(limit, offset)}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch data sources' };
  }
}

async function getDataSource(sourceId: string, signal?: AbortSignal): ApiResult<DataSource> {
  try {
    const data = await apiClient.get<DataSource>(adminDataSourceUrl(sourceId), { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch data source' };
  }
}

async function updateDataSource(sourceId: string, payload: DataSourceUpdate): ApiResult<DataSource> {
  try {
    const data = await apiClient.patch<DataSource>(adminDataSourceUrl(sourceId), payload, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update data source' };
  }
}

async function testDataSourceConnection(sourceId: string): ApiResult<DataSourceTestResult> {
  try {
    const data = await apiClient.post<DataSourceTestResult>(adminDataSourceTestUrl(sourceId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to test data source connection' };
  }
}

async function bulkSaveDataSourceConfiguration(
  payload: DataSourceBulkSavePayload,
): ApiResult<DataSourceBulkSaveResponse> {
  try {
    const data = await apiClient.put<DataSourceBulkSaveResponse>(
      ADMIN_DATA_SOURCES_CONFIGURATION_URL,
      payload,
      { auth: true },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to save data source configuration' };
  }
}

async function getDataSourceSyncSchedule(signal?: AbortSignal): ApiResult<SyncScheduleResponse> {
  try {
    const data = await apiClient.get<SyncScheduleResponse>(ADMIN_DATA_SOURCES_SYNC_SCHEDULE_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch data source sync schedule' };
  }
}

// ── Subscribers ──────────────────────────────────────────────────────────────
async function getSubscriberMetrics(signal?: AbortSignal): ApiResult<SubscriberMetrics> {
  try {
    const data = await apiClient.get<SubscriberMetrics>(ADMIN_SUBSCRIBERS_METRICS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch subscriber metrics' };
  }
}

interface SubscriberListParams {
  status?: 'active' | 'past_due' | 'canceled';
  search?: string;
  limit?: number;
  offset?: number;
}

async function getSubscribers(params: SubscriberListParams = {}, signal?: AbortSignal): ApiResult<SubscriberListResponse> {
  try {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    query.set('limit', String(params.limit ?? 25));
    query.set('offset', String(params.offset ?? 0));
    const data = await apiClient.get<SubscriberListResponse>(
      `${ADMIN_SUBSCRIBERS_URL}?${query.toString()}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch subscribers' };
  }
}

async function blockSubscriber(userId: string): ApiResult<{ success: boolean; message: string }> {
  try {
    const data = await apiClient.post<{ success: boolean; message: string }>(adminSubscriberBlockUrl(userId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to block subscriber' };
  }
}

async function unblockSubscriber(userId: string): ApiResult<{ success: boolean; message: string }> {
  try {
    const data = await apiClient.post<{ success: boolean; message: string }>(adminSubscriberUnblockUrl(userId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to unblock subscriber' };
  }
}

async function creditSubscriber(userId: string, payload: CreditAdjustment): ApiResult<CreditAdjustmentResponse> {
  try {
    const data = await apiClient.post<CreditAdjustmentResponse>(adminSubscriberCreditUrl(userId), payload, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to adjust subscriber credits' };
  }
}

// ── Email Gating ─────────────────────────────────────────────────────────────
async function getEmailGatingRecords(
  params: { limit?: number; offset?: number; search?: string } = {},
  signal?: AbortSignal,
): ApiResult<PaginatedResponse<EmailGatingRecord>> {
  try {
    const query = new URLSearchParams();
    query.set('limit', String(params.limit ?? 50));
    query.set('offset', String(params.offset ?? 0));
    if (params.search) query.set('search', params.search);
    const data = await apiClient.get<PaginatedResponse<EmailGatingRecord>>(
      `${ADMIN_EMAIL_GATING_URL}?${query.toString()}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch email gating records' };
  }
}

async function blockEmailGatingRecord(recordId: string): ApiResult<EmailGatingRecord> {
  try {
    const data = await apiClient.post<EmailGatingRecord>(adminEmailGatingBlockUrl(recordId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to block email' };
  }
}

async function unblockEmailGatingRecord(recordId: string): ApiResult<EmailGatingRecord> {
  try {
    const data = await apiClient.post<EmailGatingRecord>(adminEmailGatingUnblockUrl(recordId), {}, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to unblock email' };
  }
}

// ── PDF Reports ──────────────────────────────────────────────────────────────
async function getPdfReports(limit = 25, offset = 0, signal?: AbortSignal): ApiResult<PaginatedResponse<PdfReport>> {
  try {
    const data = await apiClient.get<PaginatedResponse<PdfReport>>(
      `${ADMIN_PDF_REPORTS_URL}${paginationQuery(limit, offset)}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch PDF reports' };
  }
}

async function getPdfReportPreviewUrl(reportId: string): ApiResult<PdfReportPreviewResponse> {
  try {
    const data = await apiClient.get<PdfReportPreviewResponse>(adminPdfReportPreviewUrl(reportId), { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to get report preview' };
  }
}

async function downloadPdfReport(reportId: string): ApiResult<Blob> {
  try {
    const data = await apiClient.get<Blob>(adminPdfReportDownloadUrl(reportId), {
      auth: true,
      responseType: 'blob',
    });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to download report' };
  }
}

async function resendPdfReport(reportId: string, email?: string): ApiResult<ResendReportResponse> {
  try {
    const payload: Record<string, string> = {};
    if (email) payload.email = email;
    const data = await apiClient.post<ResendReportResponse>(adminPdfReportResendUrl(reportId), { payload }, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to resend report' };
  }
}

// ── Admin Users ──────────────────────────────────────────────────────────────
async function getAdminUsers(limit = 50, offset = 0, signal?: AbortSignal): ApiResult<PaginatedResponse<AdminUserRecord>> {
  try {
    const data = await apiClient.get<PaginatedResponse<AdminUserRecord>>(
      `${ADMIN_ADMIN_USERS_URL}${paginationQuery(limit, offset)}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch admin users' };
  }
}

async function createAdminUser(payload: CreateAdminPayload): ApiResult<CreateAdminResponse> {
  try {
    const data = await apiClient.post<CreateAdminResponse>(ADMIN_ADMIN_USERS_URL, payload, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to create admin user' };
  }
}

async function updateAdminUser(id: string, payload: UpdateAdminPayload): ApiResult<AdminUserRecord> {
  try {
    const data = await apiClient.put<AdminUserRecord>(adminAdminUserUrl(id), payload, { auth: true });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to update admin user' };
  }
}

async function deleteAdminUser(id: string): ApiResult<void> {
  try {
    await apiClient.delete(adminAdminUserUrl(id), { auth: true });
    return { data: null, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to delete admin user' };
  }
}

// ── Admin Overview ────────────────────────────────────────────────────────────
async function getActivity(limit = 10, signal?: AbortSignal): ApiResult<ActivityResponse> {
  try {
    const data = await apiClient.get<ActivityResponse>(
      `${ADMIN_ACTIVITY_URL}?limit=${limit}`,
      { auth: true, signal },
    );
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch activity' };
  }
}

async function getSystemStatus(signal?: AbortSignal): ApiResult<SystemStatusResponse> {
  try {
    const data = await apiClient.get<SystemStatusResponse>(ADMIN_SYSTEM_STATUS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch system status' };
  }
}

async function getTasks(signal?: AbortSignal): ApiResult<TasksResponse> {
  try {
    const data = await apiClient.get<TasksResponse>(ADMIN_TASKS_URL, { auth: true, signal });
    return { data, error: null };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Failed to fetch tasks' };
  }
}

// ── Named export ──────────────────────────────────────────────────────────────
export const adminApi = {
  getAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  getMetrics,
  getProductionSignals,
  getIncentives,
  createIncentive,
  updateIncentive,
  deleteIncentive,
  getIncentiveSyncStatus,
  getIncentivePendingChanges,
  approveIncentivePendingChange,
  rejectIncentivePendingChange,
  triggerIncentiveSync,
  getIncentiveSyncSettings,
  updateIncentiveSyncSettings,
  getCrewRates,
  createCrewRate,
  updateCrewRate,
  deleteCrewRate,
  getCrewCostSyncStatus,
  getCrewCostPendingChanges,
  approveCrewCostPendingChange,
  rejectCrewCostPendingChange,
  triggerCrewCostSync,
  getCrewCostSyncSettings,
  updateCrewCostSyncSettings,
  getComparables,
  createComparable,
  updateComparable,
  deleteComparable,
  syncComparablesTMDB,
  getGrants,
  createGrant,
  updateGrant,
  deleteGrant,
  bulkImportGrants,
  triggerGrantSync,
  getGrantSyncStatus,
  getGrantPendingChanges,
  approveGrantPendingChange,
  rejectGrantPendingChange,
  getGrantSyncSettings,
  updateGrantSyncSettings,
  getFestivals,
  createFestival,
  updateFestival,
  deleteFestival,
  triggerFestivalSync,
  getFestivalSyncStatus,
  getFestivalPendingChanges,
  approveFestivalPendingChange,
  rejectFestivalPendingChange,
  getFestivalSyncSettings,
  updateFestivalSyncSettings,
  getDataSources,
  getDataSource,
  updateDataSource,
  testDataSourceConnection,
  bulkSaveDataSourceConfiguration,
  getDataSourceSyncSchedule,
  getSubscriberMetrics,
  getSubscribers,
  blockSubscriber,
  unblockSubscriber,
  creditSubscriber,
  getEmailGatingRecords,
  blockEmailGatingRecord,
  unblockEmailGatingRecord,
  getPdfReports,
  getPdfReportPreviewUrl,
  downloadPdfReport,
  resendPdfReport,
  getActivity,
  getSystemStatus,
  getTasks,
  getBusinessMetrics,
};
