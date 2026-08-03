import type {
  AcceptInvitationInput,
  AuthResponse,
  AuthUser,
  ForgotPasswordInput,
  GoogleSignInInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
} from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

// Thin wrappers over apiClient, one per backend endpoint (apps/api/src/modules/iam/presentation/auth.controller.ts).
// TanStack Query hooks (use-auth.ts) call these; components never call apiClient directly.
export const authApi = {
  register: (input: RegisterInput) => apiClient.post<AuthResponse>('/auth/register', input),
  login: (input: LoginInput) => apiClient.post<AuthResponse>('/auth/login', input),
  logout: () => apiClient.post<void>('/auth/logout'),
  me: () => apiClient.get<AuthUser>('/auth/me'),
  acceptInvitation: (input: AcceptInvitationInput) =>
    apiClient.post<AuthResponse>('/auth/accept-invitation', input),
  forgotPassword: (input: ForgotPasswordInput) =>
    apiClient.post<{ message: string }>('/auth/forgot-password', input),
  resetPassword: (input: ResetPasswordInput) => apiClient.post<AuthResponse>('/auth/reset-password', input),
  googleSignIn: (input: GoogleSignInInput) => apiClient.post<AuthResponse>('/auth/google', input),
  uploadAvatar: (contentType: string, data: string) =>
    apiClient.post<{ avatarUrl: string }>('/auth/me/avatar', { contentType, data }),
};
