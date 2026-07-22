// Shared result shape returned by every command/query that produces an authenticated session
// (Register, Login, Refresh) or profile view (GetCurrentUser). Kept in Application, not
// Presentation, so the same shape backs both the HTTP DTO and any future non-HTTP consumer
// (e.g. a GraphQL resolver, Solution Architecture §19).
export interface AuthenticatedUserView {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  organizationName: string;
  roleKey: string;
  permissions: string[];
}

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
  user: AuthenticatedUserView;
}
