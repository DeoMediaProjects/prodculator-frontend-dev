import axios, { AxiosError, AxiosHeaders, AxiosRequestConfig } from 'axios';
import type { Territory } from '@/services/admin.types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const ACCESS_TOKEN_KEY = 'prodculator_access_token';
const REFRESH_TOKEN_KEY = 'prodculator_refresh_token';
const ADMIN_SESSION_KEY = 'prodculator_admin_session';

type AuthListener = (authenticated: boolean) => void;
const authListeners = new Set<AuthListener>();

function emitAuthChange(authenticated: boolean) {
  authListeners.forEach((listener) => listener(authenticated));
}

export function subscribeAuthState(listener: AuthListener) {
  authListeners.add(listener);
  return () => authListeners.delete(listener);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  emitAuthChange(true);
}

// Like setTokens but does NOT emit an auth-state change event.
// Use for admin sign-in so the regular-user onAuthStateChange listener
// does not fire and call /api/auth/me with an admin token.
export function setTokensSilent(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(ADMIN_SESSION_KEY, 'true');
}

export function isAdminSession(): boolean {
  return localStorage.getItem(ADMIN_SESSION_KEY) === 'true';
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
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

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

axiosClient.interceptors.request.use((config) => {
  const options = config as InternalRequestConfig;
  if (options._requiresAuth) {
    const token = getAccessToken();
    if (token) {
      const headers = AxiosHeaders.from(config.headers || {});
      headers.set('Authorization', `Bearer ${token}`);
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

type RefreshResponse = {
  access_token: string;
  refresh_token: string;
};

async function attemptTokenRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) return false;

      const endpoint = isAdminSession() ? '/api/admin/auth/refresh' : '/api/auth/refresh';
      const response = await axiosClient.post<RefreshResponse>(
        endpoint,
        { refresh_token: refreshToken },
        {
          _requiresAuth: false,
          _isRetry: true,
        } as InternalRequestConfig
      );

      const data = response.data;
      if (isAdminSession()) {
        setTokensSilent(data.access_token, data.refresh_token);
      } else {
        setTokens(data.access_token, data.refresh_token);
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
        originalRequest._isRetry = true;
        const token = getAccessToken();
        if (token) {
          // originalRequest.headers is always an AxiosHeaders instance at runtime;
          // the wide static type on AxiosRequestConfig just can't express that.
          (originalRequest.headers as AxiosHeaders).set('Authorization', `Bearer ${token}`);
        }
        return axiosClient.request(originalRequest);
      }
      clearTokens();
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

  logRequest(method, url, init.body);

  try {
    const response = await fetch(resolvedInput, init);
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
