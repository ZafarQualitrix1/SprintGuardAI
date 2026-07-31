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

async function rawRequest<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  const { accessToken } = useAuthStore.getState();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => undefined)) as ApiErrorResponse | undefined;
    const message = Array.isArray(errorBody?.message)
      ? errorBody.message.join(', ')
      : (errorBody?.message ?? response.statusText);
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
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

// Single fetch wrapper every TanStack Query hook goes through (features/*/api/*.ts). Attaches the
// JWT from the Zustand auth store, normalizes error responses into the shared ApiErrorResponse
// shape emitted by apps/api's AllExceptionsFilter, and transparently renews an expired access token
// once via the refresh cookie before giving up -- this is what lets a session outlive a single
// short-lived access token instead of forcing a full re-login every time it expires.
async function request<TResponse>(path: string, options: RequestOptions = {}): Promise<TResponse> {
  try {
    return await rawRequest<TResponse>(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 401 && !SKIP_REFRESH_PATHS.includes(path)) {
      const refreshed = await refreshSession();
      if (refreshed) {
        return rawRequest<TResponse>(path, options);
      }
    }
    throw error;
  }
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
};
