'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentUser } from '@/features/auth/api';

// Client-side session guard for the (dashboard) route group. Redirects to /login when there is no
// access token, or when the token turns out to be invalid/expired and couldn't be silently renewed
// (GET /auth/me returns 401 -- apiClient already retries once via POST /auth/refresh before this
// ever surfaces, see lib/api-client.ts).
// A full server-side redirect (reading the refresh cookie in middleware.ts) is a reasonable
// future hardening step; this covers the MVP client-rendered app shell.
//
// Must wait for `hasHydrated` before evaluating accessToken: zustand's persist middleware reads
// localStorage asynchronously, so on every hard refresh accessToken is briefly null in-memory even
// when a valid session is about to be restored. Redirecting on that pre-hydration null is what
// caused every page refresh to bounce straight to /login regardless of session validity.
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const { isError } = useCurrentUser({ enabled: hasHydrated });

  useEffect(() => {
    if (hasHydrated && (!accessToken || isError)) {
      router.replace('/login');
    }
  }, [hasHydrated, accessToken, isError, router]);

  if (!hasHydrated || !accessToken) {
    return null;
  }

  return <>{children}</>;
}
