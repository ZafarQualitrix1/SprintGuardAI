import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

// Thin wrappers over apiClient, one per backend endpoint (apps/api/src/modules/iam/presentation/auth.controller.ts).
// TanStack Query hooks (use-auth.ts) call these; components never call apiClient directly.
export const authApi = {
  register: (input: RegisterInput) => apiClient.post<AuthResponse>('/auth/register', input),
  login: (input: LoginInput) => apiClient.post<AuthResponse>('/auth/login', input),
  logout: () => apiClient.post<void>('/auth/logout'),
  me: () => apiClient.get<AuthUser>('/auth/me'),
};
