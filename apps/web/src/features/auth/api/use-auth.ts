'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AuthResponse } from '@sprintguard/shared';
import { authApi } from './auth.api';
import { useAuthStore } from '@/stores/auth-store';
import { ApiError } from '@/lib/api-client';

function applySession(session: AuthResponse) {
  useAuthStore.getState().setSession(session.accessToken, session.user);
}

export function useLogin() {
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: applySession,
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: applySession,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      // Clear client state regardless of whether the server call succeeded (e.g. refresh
      // cookie already expired) -- the user's intent to log out always wins locally.
      useAuthStore.getState().clearSession();
      queryClient.clear();
    },
  });
}

// Backs the (dashboard) session guard: treats a 401 as "no session" rather than an error to
// surface, since an expired/missing access token is the expected steady state for a logged-out
// visitor hitting a protected route. `enabled` additionally lets SessionGuard hold this query off
// until the persisted auth store has hydrated, so it never fires with a not-yet-restored token.
export function useCurrentUser(options?: { enabled?: boolean }) {
  const accessToken = useAuthStore((state) => state.accessToken);

  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
    enabled: Boolean(accessToken) && (options?.enabled ?? true),
    retry: (failureCount, error) => error instanceof ApiError && error.statusCode !== 401 && failureCount < 1,
  });
}
