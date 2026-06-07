// ── Admin user management endpoints ─────────────────────────────────────────
export const ADMIN_ADMIN_USERS_URL = '/api/admin/admin-users';
export const adminAdminUserUrl = (id: string) => `/api/admin/admin-users/${id}`;

// ── Collection endpoints ───────────────────────────────────────────────────────
export const ADMIN_USERS_URL = '/api/admin/users';
export const ADMIN_REPORTS_URL = '/api/admin/reports';
export const ADMIN_METRICS_URL = '/api/admin/metrics';
export const ADMIN_BUSINESS_METRICS_URL = '/api/admin/business-metrics';
export const ADMIN_ACTIVITY_URL = '/api/admin/activity';
export const ADMIN_SYSTEM_STATUS_URL = '/api/admin/system-status';
export const ADMIN_TASKS_URL = '/api/admin/tasks';
export const ADMIN_PRODUCTION_SIGNALS_URL = '/api/admin/production-signals';
export const ADMIN_INCENTIVES_URL = '/api/admin/incentives';
export const ADMIN_CREW_COSTS_URL = '/api/admin/crew-costs';
export const ADMIN_COMPARABLES_URL = '/api/admin/comparables';
export const ADMIN_COMPARABLES_SYNC_TMDB_URL = '/api/admin/comparables/sync-tmdb';
export const ADMIN_GRANTS_URL = '/api/admin/grants';
export const ADMIN_GRANTS_BULK_IMPORT_URL = '/api/admin/grants/bulk-import';
export const ADMIN_GRANTS_SYNC_URL = '/api/admin/grants/sync';
export const ADMIN_GRANTS_SYNC_STATUS_URL = '/api/admin/grants/sync-status';
export const ADMIN_GRANTS_PENDING_CHANGES_URL = '/api/admin/grants/pending-changes';
export const adminGrantPendingChangeApproveUrl = (changeId: string) => `/api/admin/grants/pending-changes/${changeId}/approve`;
export const adminGrantPendingChangeRejectUrl = (changeId: string) => `/api/admin/grants/pending-changes/${changeId}/reject`;
export const ADMIN_GRANTS_SYNC_SETTINGS_URL = '/api/admin/grants/sync-settings';
export const ADMIN_FESTIVALS_URL = '/api/admin/festivals';
export const ADMIN_FESTIVALS_SYNC_URL = '/api/admin/festivals/sync';
export const ADMIN_FESTIVALS_SYNC_STATUS_URL = '/api/admin/festivals/sync-status';
export const ADMIN_FESTIVALS_PENDING_CHANGES_URL = '/api/admin/festivals/pending-changes';
export const adminFestivalPendingChangeApproveUrl = (changeId: string) => `/api/admin/festivals/pending-changes/${changeId}/approve`;
export const adminFestivalPendingChangeRejectUrl = (changeId: string) => `/api/admin/festivals/pending-changes/${changeId}/reject`;
export const ADMIN_FESTIVALS_SYNC_SETTINGS_URL = '/api/admin/festivals/sync-settings';
export const ADMIN_DATA_SOURCES_URL = '/api/admin/data-sources';
export const ADMIN_DATA_SOURCES_CONFIGURATION_URL = '/api/admin/data-sources/configuration';
export const ADMIN_DATA_SOURCES_SYNC_SCHEDULE_URL = '/api/admin/data-sources/sync-schedule';

// ── Subscriber endpoints ──────────────────────────────────────────────────────
export const ADMIN_SUBSCRIBERS_URL = '/api/admin/subscribers';
export const ADMIN_SUBSCRIBERS_METRICS_URL = '/api/admin/subscribers/metrics';
export const adminSubscriberBlockUrl   = (userId: string) => `/api/admin/subscribers/${userId}/block`;
export const adminSubscriberUnblockUrl = (userId: string) => `/api/admin/subscribers/${userId}/unblock`;
export const adminSubscriberCreditUrl  = (userId: string) => `/api/admin/subscribers/${userId}/credit`;

// ── Item endpoints (parameterised) ────────────────────────────────────────────
export const adminIncentiveUrl  = (id: string) => `/api/admin/incentives/${id}`;
export const adminCrewCostUrl   = (id: string) => `/api/admin/crew-costs/${id}`;
export const adminComparableUrl = (id: string) => `/api/admin/comparables/${id}`;
export const adminGrantUrl      = (id: string) => `/api/admin/grants/${id}`;
export const adminFestivalUrl   = (id: string) => `/api/admin/festivals/${id}`;
export const adminDataSourceUrl = (id: string) => `/api/admin/data-sources/${id}`;
export const adminDataSourceTestUrl = (id: string) => `/api/admin/data-sources/${id}/test`;

// ── Incentive sync endpoints ─────────────────────────────────────────────────
export const ADMIN_INCENTIVES_SYNC_STATUS_URL       = '/api/admin/incentives/sync-status';
export const ADMIN_INCENTIVES_PENDING_CHANGES_URL    = '/api/admin/incentives/pending-changes';
export const adminIncentivePendingChangeApproveUrl   = (changeId: string) => `/api/admin/incentives/pending-changes/${changeId}/approve`;
export const adminIncentivePendingChangeRejectUrl    = (changeId: string) => `/api/admin/incentives/pending-changes/${changeId}/reject`;
export const ADMIN_INCENTIVES_SYNC_URL               = '/api/admin/incentives/sync';
export const ADMIN_INCENTIVES_SYNC_SETTINGS_URL      = '/api/admin/incentives/sync-settings';

// ── Email gating endpoints ──────────────────────────────────────────────────
export const ADMIN_EMAIL_GATING_URL = '/api/admin/email-gating';
export const adminEmailGatingBlockUrl   = (recordId: string) => `/api/admin/email-gating/${recordId}/block`;
export const adminEmailGatingUnblockUrl = (recordId: string) => `/api/admin/email-gating/${recordId}/unblock`;

// ── PDF report endpoints ─────────────────────────────────────────────────────
export const ADMIN_PDF_REPORTS_URL = '/api/admin/pdf-reports';
export const adminPdfReportPreviewUrl = (id: string) => `/api/admin/pdf-reports/${id}/preview`;
export const adminPdfReportDownloadUrl = (id: string) => `/api/admin/pdf-reports/${id}/download`;
export const adminPdfReportResendUrl = (id: string) => `/api/admin/pdf-reports/${id}/resend`;

// ── Crew costs sync endpoints ────────────────────────────────────────────────
export const ADMIN_CREW_COSTS_SYNC_STATUS_URL        = '/api/admin/crew-costs/sync-status';
export const ADMIN_CREW_COSTS_PENDING_CHANGES_URL    = '/api/admin/crew-costs/pending-changes';
export const adminCrewCostPendingChangeApproveUrl    = (changeId: string) => `/api/admin/crew-costs/pending-changes/${changeId}/approve`;
export const adminCrewCostPendingChangeRejectUrl     = (changeId: string) => `/api/admin/crew-costs/pending-changes/${changeId}/reject`;
export const ADMIN_CREW_COSTS_SYNC_URL               = '/api/admin/crew-costs/sync';
export const ADMIN_CREW_COSTS_SYNC_SETTINGS_URL      = '/api/admin/crew-costs/sync-settings';
