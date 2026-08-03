import type { ApiErrorResponse, AuthResponse } from '@sprintguard/shared';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

// Endpoints where a 401 must never trigger the refresh-and-retry below: /auth/refresh itself would
// recurse, and a 401 from /login or /register means "wrong credentials", not "expired session" --
// retrying those against a refresh cookie can't fix a wrong password and would just add latency.
const SKIP_REFRESH_PATHS = ['/auth/login', '/auth/register', '/auth/refresh'];

// Shared by every raw request variant below: attaches auth, sends credentials, and normalizes a
// non-OK response into ApiError. Callers each handle their own success-body parsing (json/blob)
// since that varies by variant.
async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const { accessToken } = useAuthStore.getState();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => undefined)) as ApiErrorResponse | undefined;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(', ')
      : (errorBody?.message ?? response.statusText);
    throw new ApiError(response.status, message);
  }

  return response;
}

async function rawRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const response = await rawFetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

// FormData's own boundary-including Content-Type must be set by the browser, not us -- explicitly
// omitting the header (rather than defaulting to JSON like rawRequest) is the whole point of this
// variant. Used for multipart uploads (e.g. the Submit for Review attachment).
async function rawRequestForm<TResponse>(
  path: string,
  formData: FormData,
  options: Omit<RequestOptions, 'body'> = {},
): Promise<TResponse> {
  const response = await rawFetch(path, { ...options, method: options.method ?? 'POST', body: formData });
  if (response.status === 204) {
    return undefined as TResponse;
  }
  return (await response.json()) as TResponse;
}

// For binary downloads (e.g. test-case export) -- same auth/error handling as rawRequest, but
// resolves a Blob instead of parsing JSON on success.
async function rawRequestBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
  const response = await rawFetch(path, {
    ...options,
    headers: options.body !== undefined ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  return response.blob();
}

// The access token is short-lived by design (apps/api JWT_ACCESS_TTL); the httpOnly refresh cookie
// (set on login/register, scoped to this exact path) is what actually keeps a session alive across
// that expiry. De-duped to a single in-flight call so a burst of concurrent 401s (e.g. several
// widgets fetching on mount) triggers one refresh, not one per request.
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest<AuthResponse>('/auth/refresh', { method: 'POST' })
      .then((session) => {
        useAuthStore.getState().setSession(session.accessToken, session.user);
        return true;
      })
      .catch(() => {
        useAuthStore.getState().clearSession();
        return false;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

// Shared by every apiClient method (JSON, form-upload, blob-download). Attaches the JWT from the
// Zustand auth store (inside the raw* functions above), normalizes error responses into the shared
// ApiErrorResponse shape emitted by apps/api's AllExceptionsFilter, and transparently renews an
// expired access token once via the refresh cookie before giving up -- this is what lets a session
// outlive a single short-lived access token instead of forcing a full re-login every time it expires.
async function withAuthRetry<TResponse>(path: string, attempt: () => Promise<TResponse>): Promise<TResponse> {
  try {
    return await attempt();
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401 && !SKIP_REFRESH_PATHS.includes(path)) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return attempt();
      }
    }
    throw error;
  }
}

function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  return withAuthRetry(path, () => rawRequest<TResponse>(path, options));
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
  // Multipart upload (e.g. a Submit for Review attachment) -- FormData must not be JSON-stringified
  // and must not have Content-Type set manually (the browser adds the multipart boundary itself).
  postForm: <T>(path: string, formData: FormData) =>
    withAuthRetry(path, () => rawRequestForm<T>(path, formData)),
  // Binary download (e.g. Excel/CSV/PDF test-case export) -- resolves a Blob instead of parsing JSON.
  getBlob: (path: string) => withAuthRetry(path, () => rawRequestBlob(path, { method: 'GET' })),
};
