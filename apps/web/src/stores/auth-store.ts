import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName: string;
  roleKey: string;
  permissions: string[];
}

interface AuthState {
  accessToken: string | null;
  user: AuthenticatedUser | null;
  hasHydrated: boolean;
  setSession: (accessToken: string, user: AuthenticatedUser) => void;
  clearSession: () => void;
  setHasHydrated: (value: boolean) => void;
}

// Client-side session state (Solution Architecture §25: short-lived access token, refresh handled
// via httpOnly cookie + a dedicated refresh endpoint, not stored here). Persisted to localStorage
// only for the access token/user profile so a hard refresh doesn't force a full re-login while the
// refresh token cookie is still valid.
//
// `hasHydrated` tracks whether zustand's `persist` middleware has finished reading localStorage.
// That read is always async (it can't run during SSR/first paint), so on every hard refresh the
// store briefly renders its in-memory default (accessToken: null) before the real value loads.
// Consumers (SessionGuard) MUST wait for hasHydrated before treating a null accessToken as "logged
// out" -- otherwise every hard refresh looks indistinguishable from a fresh logged-out visit and
// redirects to /login even with a perfectly valid persisted session.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      hasHydrated: false,
      setSession: (accessToken, user) => set({ accessToken, user }),
      clearSession: () => set({ accessToken: null, user: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'sprintguard-auth',
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
