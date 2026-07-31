import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth-store';

const user = {
  id: 'user-1',
  email: 'jane@acme.com',
  fullName: 'Jane Doe',
  organizationId: 'org-1',
  organizationName: 'Acme Corp',
  roleKey: 'OWNER',
  permissions: ['sprint:read', 'sprint:write'],
};

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('starts with no session', () => {
    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setSession stores the access token and user profile', () => {
    useAuthStore.getState().setSession('token-123', user);

    const state = useAuthStore.getState();
    expect(state.accessToken).toBe('token-123');
    expect(state.user).toEqual(user);
  });

  it('clearSession resets both the token and user profile', () => {
    useAuthStore.getState().setSession('token-123', user);
    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.accessToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setHasHydrated flips the hydration flag consumers gate their redirect logic on', () => {
    useAuthStore.getState().setHasHydrated(false);
    expect(useAuthStore.getState().hasHydrated).toBe(false);

    useAuthStore.getState().setHasHydrated(true);
    expect(useAuthStore.getState().hasHydrated).toBe(true);
  });
});
