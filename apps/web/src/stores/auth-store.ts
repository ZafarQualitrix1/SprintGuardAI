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
  setSession: (accessToken: string, user: AuthenticatedUser) => void;
  clearSession: () => void;
}

// Client-side session state (Solution Architecture §25: short-lived access token, refresh handled
// via httpOnly cookie + a dedicated refresh endpoint, not stored here). Persisted to localStorage
// only for the access token/user profile so a hard refresh doesn't force a full re-login while the
// refresh token cookie is still valid.
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      setSession: (accessToken, user) => set({ accessToken, user }),
      clearSession: () => set({ accessToken: null, user: null }),
    }),
    { name: 'sprintguard-auth' },
  ),
);
