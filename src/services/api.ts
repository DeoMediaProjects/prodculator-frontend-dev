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
  if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
    return process.env.NODE_ENV === 'development';
  }
  return import.meta.env.MODE === 'development';
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
    return Promise.reject(new Error(detail));
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

  // Send cookies, and echo the CSRF token on state-changing requests.
  const headers = new Headers(init.headers || {});
  if (!CSRF_SAFE_METHODS.has(method.toLowerCase())) {
    const csrf = getCsrfToken();
    if (csrf) headers.set(CSRF_HEADER_NAME, csrf);
  }
  const finalInit: RequestInit = { credentials: 'include', ...init, headers };

  logRequest(method, url, init.body);

  try {
    const response = await fetch(resolvedInput, finalInit);
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

/** Fetches the canonical territory list from GET /api/territories. */
export async function getTerritories(): Promise<Territory[]> {
  return apiClient.get<Territory[]>('/api/territories');
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
