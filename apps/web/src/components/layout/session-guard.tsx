'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useCurrentUser } from '@/features/auth/api';

// Client-side session guard for the (dashboard) route group. Redirects to /login when there is no
// access token, or when the token turns out to be invalid/expired (GET /auth/me returns 401).
// A full server-side redirect (reading the refresh cookie in middleware.ts) is a reasonable
// future hardening step; this covers the MVP client-rendered app shell.
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const { isError } = useCurrentUser();

  useEffect(() => {
    if (!accessToken || isError) {
      router.replace('/login');
    }
  }, [accessToken, isError, router]);

  if (!accessToken) {
    return null;
  }

  return <>{children}</>;
}
