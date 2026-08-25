import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig } from 'axios';
import type { Territory } from '@/services/admin.types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

// Auth tokens are no longer stored in JS-readable storage. The backend issues
// the access/refresh JWTs as httpOnly cookies (unreadable by JavaScript, so XSS
// can't exfiltrate them) and the browser attaches them automatically because the
// client sends requests with credentials. The only readable cookie is the CSRF
// token, which we echo back in a header (double-submit). `prodculator_admin_session`
// remains a non-secret local marker recording which session type is active.
const ADMIN_SESSION_KEY = 'prodculator_admin_session';
const CSRF_COOKIE_NAME = 'pc_csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

/**
 * A failed request, carrying the HTTP status alongside the message.
 *
 * The interceptor used to reject with a bare Error, so callers could not tell a
 * "this object is gone" 404 from a transient network failure and had no way to
 * word the difference for the user. Anything that wants to react to a specific
 * status can now check `status` instead of matching on message text.
 */
export class ApiError extends Error {
  readonly status?: number;
  /**
   * The raw `detail` payload, when the API sent a structured one rather than a
   * string. Some endpoints need the caller to branch on *why* a call failed and
   * not just tell the user: an invite claim distinguishes expired from revoked
   * from already-used, and an entitlement refusal lists the withheld sections
   * and their reversion dates. `message` still carries readable text in every
   * case, so a caller that does not care can keep ignoring this.
   */
  readonly detail?: unknown;

  constructor(message: string, status?: number, detail?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

type AuthListener = (authenticated: boolean) => void;
const authListeners = new Set<AuthListener>();

function emitAuthChange(authenticated: boolean) {
  authListeners.forEach((listener) => listener(authenticated));
}

export function subscribeAuthState(listener: AuthListener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1');
  const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * The readable CSRF cookie. Its presence also serves as the "is there a session?"
 * signal, since the JWTs themselves live in httpOnly cookies JS cannot read.
 */
export function getCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE_NAME);
}

export function isAuthenticated(): boolean {
  return getCsrfToken() !== null;
}

/** Mark a regular-user session as established and notify listeners. */
export function markAuthenticated() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  emitAuthChange(true);
}

// Like markAuthenticated but does NOT emit an auth-state change event, and records
// the admin marker. Used for admin sign-in so the regular-user onAuthStateChange
// listener does not fire and call /api/auth/me with an admin session.
export function markAdminAuthenticated() {
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');
}

export function isAdminSession(): boolean {
  return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

/**
 * Forget local session state. The httpOnly auth cookies are cleared server-side
 * by the signout response; here we drop the admin marker and notify listeners.
 */
export function clearAuthState() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  emitAuthChange(false);
}

function isDevelopmentMode(): boolean {
  // Vite statically replaces import.meta.env.DEV — the canonical dev-mode signal
  // in a Vite app. (Previously also probed Node's `process.env`, which doesn't
  // exist in the browser and isn't typed here.)
  return import.meta.env.DEV;
}

const IS_DEVELOPMENT = isDevelopmentMode();

function resolveRequestUrl(url?: string, baseURL?: string): string {
  if (!url) return baseURL || API_BASE_URL;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const base = (baseURL || API_BASE_URL).replace(/\/$/, '');
  const path = url.startsWith('/') ? url : `/${url}`;
  return `${base}${path}`;
}

function logRequest(method: string | undefined, url: string, payload: unknown) {
  if (!IS_DEVELOPMENT) return;
  console.log('[API REQUEST]', {
    method: (method || 'GET').toUpperCase(),
    url,
    payload,
  });
}

function logResponse(method: string | undefined, url: string, status: number, data: unknown) {
  if (!IS_DEVELOPMENT) return;
  console.log('[API RESPONSE]', {
    method: (method || 'GET').toUpperCase(),
    url,
    status,
    data,
  });
}

function logError(method: string | undefined, url: string, payload: unknown, error: unknown) {
  if (!IS_DEVELOPMENT) return;
  console.error('[API ERROR]', {
    method: (method || 'GET').toUpperCase(),
    url,
    payload,
    error,
  });
}

function humaniseValidationError(err: { loc?: unknown[]; msg?: string; input?: unknown }): string {
  const field = Array.isArray(err.loc)
    ? err.loc.filter((p) => p !== 'body' && p !== 'query').join(' → ')
    : null;
  const msg = err.msg ?? 'Invalid value';
  return field ? `${field}: ${msg}` : msg;
}

function extractErrorDetail(payload: unknown, fallback: string): string {
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload && typeof payload === 'object') {
    const asObject = payload as { detail?: unknown; message?: string };

    // FastAPI 422: detail is an array of Pydantic validation errors.
    if (Array.isArray(asObject.detail)) {
      const lines = (asObject.detail as Array<{ loc?: unknown[]; msg?: string; input?: unknown }>)
        .slice(0, 3)
        .map(humaniseValidationError);
      return lines.length === 1
        ? lines[0]
        : `Please fix the following: ${lines.join('; ')}`;
    }

    if (typeof asObject.detail === 'string' && asObject.detail.trim()) return asObject.detail;

    // Structured detail: `{ message, reason, ... }`. Endpoints use this shape
    // when the caller has to act on the reason as well as show the text (an
    // invite that is expired vs. revoked, an entitlement refusal that lists the
    // withheld sections). Without this the readable message was dropped and the
    // user saw the generic fallback instead.
    if (asObject.detail && typeof asObject.detail === 'object' && !Array.isArray(asObject.detail)) {
      const nested = (asObject.detail as { message?: unknown }).message;
      if (typeof nested === 'string' && nested.trim()) return nested;
    }

    if (typeof asObject.message === 'string' && asObject.message.trim()) return asObject.message;

    // Last resort — don't dump raw JSON at the user.
    return fallback;
  }
  return fallback;
}

type RequestOptions = Omit<AxiosRequestConfig, 'auth'> & {
  auth?: boolean;
  _isRetry?: boolean; // internal — prevents infinite refresh loops
};

type InternalRequestConfig = AxiosRequestConfig & {
  _requiresAuth?: boolean;
  _isRetry?: boolean;
};

// withCredentials so the browser sends/receives the httpOnly auth cookies on
// every cross-origin API call.
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

const CSRF_SAFE_METHODS = new Set(['get', 'head', 'options', 'trace']);

axiosClient.interceptors.request.use((config) => {
  // Auth travels in cookies now — no Authorization header. For state-changing
  // requests, echo the readable CSRF cookie in a header (double-submit) so the
  // backend can prove the request originated from our app.
  const method = (config.method || 'get').toLowerCase();
  if (!CSRF_SAFE_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) {
      const headers = AxiosHeaders.from(config.headers || {});
      headers.set(CSRF_HEADER_NAME, csrf);
      config.headers = headers;
    }
  }

  logRequest(config.method, resolveRequestUrl(config.url, config.baseURL), config.data);
  return config;
});

// ---------------------------------------------------------------------------
// Token refresh interceptor
// A singleton promise ensures that if multiple requests fail with 401
// simultaneously, only one refresh call is made; the rest wait for it.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<boolean> | null = null;

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      // The refresh token rides in the httpOnly cookie — send an empty body and
      // let the server rotate the cookie pair. Bail early if there's no session
      // signal at all, to avoid a pointless 401.
      if (!isAuthenticated()) return false;

      const endpoint = isAdminSession() ? '/api/admin/auth/refresh' : '/api/auth/refresh';
      await axiosClient.post(
        endpoint,
        {},
        {
          _requiresAuth: false,
          _isRetry: true,
        } as InternalRequestConfig
      );

      // New cookies are set by the server; refresh the local session marker.
      if (isAdminSession()) {
        markAdminAuthenticated();
      } else {
        markAuthenticated();
      }
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

axiosClient.interceptors.response.use(
  (response) => {
    logResponse(response.config.method, resolveRequestUrl(response.config.url, response.config.baseURL), response.status, response.data);
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = (error.config || {}) as InternalRequestConfig;
    const method = originalRequest.method;
    const url = resolveRequestUrl(originalRequest.url, originalRequest.baseURL);

    if (error.response?.status === 401 && originalRequest._requiresAuth && !originalRequest._isRetry) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        // The refreshed access token is in a cookie now — just replay the
        // request; the browser re-attaches credentials automatically.
        originalRequest._isRetry = true;
        return axiosClient.request(originalRequest);
      }
      clearAuthState();
    }

    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    logError(method, url, originalRequest.data, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    const detail = extractErrorDetail(
      error.response?.data,
      error.message || `Request failed (${error.response?.status || 'unknown'})`
    );
    // The raw detail rides along so a caller can branch on `reason` without
    // re-parsing the message text it is shown.
    const rawDetail = (error.response?.data as { detail?: unknown } | undefined)?.detail;
    return Promise.reject(new ApiError(detail, error.response?.status, rawDetail));
  }
);

async function request<TData>(path: string, options: RequestOptions = {}): Promise<TData> {
  const { auth = false, _isRetry = false, ...axiosOptions } = options;
  const response = await axiosClient.request<TData>({
    url: path,
    ...axiosOptions,
    _requiresAuth: auth,
    _isRetry,
  } as InternalRequestConfig);
  return response.data;
}

async function readFetchResponseData(response: Response): Promise<unknown> {
  const responseClone = response.clone();
  const contentType = responseClone.headers.get('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      return await responseClone.json();
    }
    return await responseClone.text();
  } catch {
    return null;
  }
}

function resolveFetchInput(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== 'string') return input;
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  const path = input.startsWith('/') ? input : `/${input}`;
  return `${API_BASE_URL}${path}`;
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const resolvedInput = resolveFetchInput(input);
  const method = init.method || (input instanceof Request ? input.method : 'GET');
  const url =
    typeof resolvedInput === 'string'
      ? resolvedInput
      : resolvedInput instanceof URL
        ? resolvedInput.toString()
        : resolvedInput.url;

  // Send cookies, and echo the CSRF token on state-changing requests. Read the
  // CSRF token per attempt, not once: a refresh rotates the cookie pair, so a
  // retry has to echo the new token rather than the one that just expired.
  const buildInit = (): RequestInit => {
    const headers = new Headers(init.headers || {});
    if (!CSRF_SAFE_METHODS.has(method.toLowerCase())) {
      const csrf = getCsrfToken();
      if (csrf) headers.set(CSRF_HEADER_NAME, csrf);
    }
    return { credentials: 'include', ...init, headers };
  };

  // A Request's body is consumed by the first fetch, so keep a clone to replay.
  const retryInput = resolvedInput instanceof Request ? resolvedInput.clone() : resolvedInput;

  logRequest(method, url, init.body);

  try {
    let response = await fetch(resolvedInput, buildInit());

    // Mirror the axios interceptor: an expired access token gets one refresh and
    // one replay. Without this, callers of apiFetch (notably the Business
    // Intelligence PDF download) failed outright on a token that the shared
    // refresh path would have renewed silently. attemptTokenRefresh() bails
    // cheaply when there is no session, so this costs nothing for a genuine 401.
    if (response.status === 401) {
      const refreshed = await attemptTokenRefresh();
      if (refreshed) {
        response = await fetch(retryInput, buildInit());
      } else {
        clearAuthState();
      }
    }

    const responseData = await readFetchResponseData(response);
    logResponse(method, url, response.status, responseData);
    return response;
  } catch (error) {
    logError(method, url, init.body, error);
    throw error;
  }
}

export const apiClient = {
  baseUrl: API_BASE_URL,
  get: <T>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      data: body,
    }),
  put: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      data: body,
    }),
  patch: <T>(path: string, body?: unknown, options: RequestOptions = {}) =>
    request<T>(path, {
      ...options,
      method: 'PATCH',
      data: body,
    }),
  delete: <T>(path: string, options: RequestOptions = {}) =>
    request<T>(path, { ...options, method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData, options: RequestOptions = {}) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      data: formData,
    }),
};

// ── Public endpoints (no auth required) ──────────────────────────────────────

/** Fetches the canonical territory list from GET /api/territories.
 *
 * The endpoint has shipped in two shapes: a bare array carrying `isSubTerritory`,
 * and `{ territories: [...] }` where the same fact is expressed as
 * `level: 'national' | 'regional'`. Accept either and derive the flag here, so
 * the territory pickers keep working whichever build of the API answers. Without
 * this, the newer shape silently yields an empty list and the picker loses every
 * territory.
 */
/**
 * @param productionFormat when given, each territory also carries
 *   `formatEligibility` for that format. Lets the intake warning be driven by the
 *   programme records rather than by the format alone.
 */
export async function getTerritories(
  includeAll = false,
  productionFormat?: string,
): Promise<Territory[]> {
  const params = new URLSearchParams();
  if (includeAll) params.set('include_all', 'true');
  if (productionFormat) params.set('format', productionFormat);
  const query = params.toString();
  const raw = await apiClient.get<unknown>(
    query ? `/api/territories?${query}` : '/api/territories',
  );
  const items = (Array.isArray(raw)
    ? raw
    : ((raw as { territories?: unknown })?.territories ?? [])) as Array<
    Partial<Territory> & { level?: string }
  >;

  return items
    .filter((item) => item && item.label)
    .map((item) => ({
      label: String(item.label),
      iso: String(item.iso ?? ''),
      parent: item.parent ?? null,
      isSubTerritory:
        typeof item.isSubTerritory === 'boolean'
          ? item.isSubTerritory
          : item.level === 'regional' || item.parent != null,
      // Older builds omit the flag entirely. Assume covered in that case, so a
      // territory is never wrongly labelled as having no incentive.
      hasActiveIncentive: item.hasActiveIncentive !== false,
      // Derived from the boolean when the API predates the three-state field, so
      // an older backend degrades to the previous behaviour rather than showing
      // every territory as unconfirmed.
      incentiveStatus:
        item.incentiveStatus === 'active'
        || item.incentiveStatus === 'unconfirmed'
        || item.incentiveStatus === 'none'
          ? item.incentiveStatus
          : item.hasActiveIncentive === false
            ? 'none'
            : 'active',
      // Older builds omit this too. Assume the territory stands on its own
      // there, so nothing is quietly demoted to a grouping control.
      hasOwnIncentive: item.hasOwnIncentive !== false,
      // Passed through only when the backend supplied it. Left undefined rather
      // than defaulted, because guessing here would either invent a confirmation
      // or raise a warning the data does not support.
      formatEligibility: item.formatEligibility,
    }));
}

// ── Project details (Producer+) ───────────────────────────────────────────────

export interface ProjectDetails {
  director_name?: string;
  director_bio?: string;
  producer_name?: string;
  producer_bio?: string;
  logline?: string;
  synopsis?: string;
  equity_sought?: string;
  equity_committed_pct?: string;
  minimum_investment?: string;
  investor_profit_share?: string;
  preferred_return?: string;
  // Phase 3
  revenue_model?: {
    low?: RevenueScenario;
    base?: RevenueScenario;
    high?: RevenueScenario;
  };
  waterfall?: {
    distribution_fee_pct?: string;
    sales_agent_commission_pct?: string;
    pa_budget?: string;
    investor_equity_pct?: string;
    preferred_return_pct?: string;
    investor_net_profit_split_pct?: string;
    producer_net_profit_split_pct?: string;
  };
}

export interface RevenueScenario {
  theatrical_domestic?: string;
  theatrical_international?: string;
  svod?: string;
  tv_broadcast?: string;
  ancillary?: string;
}

/**
 * Draft a logline and synopsis from the analysis the report already holds.
 *
 * Returns a draft for the producer to edit; nothing is saved by this call. The
 * backend refuses with 422 when the report carries too little story analysis to
 * restate, rather than inventing something.
 */
export async function draftProjectDetailsCopy(
  reportId: string,
): Promise<{ logline: string; synopsis: string }> {
  return apiClient.post<{ logline: string; synopsis: string }>(
    `/api/reports/${reportId}/project-details/draft`,
    undefined,
    { auth: true },
  );
}

export async function updateProjectDetails(
  reportId: string,
  projectDetails: ProjectDetails,
): Promise<void> {
  await apiClient.patch(
    `/api/reports/${reportId}/project-details`,
    { project_details: projectDetails },
    { auth: true },
  );
}

// ── Scenario questions (Incentive Engine v2) ─────────────────────────────────

export interface ScenarioQuestion {
  inputKey: string;
  label: string;
  helpText: string;
  inputType: string;
  requiredForExact: boolean;
  /** Every programme in this scenario that uses the answer. */
  usedBy: string[];
}

export interface ScenarioProgramme {
  programmeId: string | null;
  name: string;
  engine: string | null;
  calculationVerification: string | null;
}

export interface ScenarioQuestionSet {
  jurisdiction: string;
  territoryId: string;
  subdivisionId: string | null;
  questions: ScenarioQuestion[];
  programmes: ScenarioProgramme[];
  /** Programmes that cannot produce a figure whatever is entered, with why. */
  nonCalculating: { programmeId: string | null; name: string; reason: string }[];
}

export interface ScenarioQuestionsResponse {
  mode: string;
  limit: number | null;
  scenarios: ScenarioQuestionSet[];
}

/**
 * Which statutory cost figures to ask for, per selected jurisdiction.
 *
 * The wizard renders whatever comes back. It holds no rule about which question
 * belongs to which territory, because that is programme data and changing it
 * must not need a deployment.
 */
export async function getScenarioQuestions(
  territories: string[],
  mode: string,
): Promise<ScenarioQuestionsResponse> {
  const params = new URLSearchParams({
    territories: territories.join(','),
    mode,
  });
  return apiClient.get<ScenarioQuestionsResponse>(
    `/api/scenarios/questions?${params.toString()}`,
  );
}
