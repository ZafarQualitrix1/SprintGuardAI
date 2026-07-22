export const TOKEN_SERVICE = Symbol('ITokenService');

export interface AccessTokenClaims {
  sub: string; // userId
  orgId: string;
}

export interface GeneratedRefreshToken {
  token: string; // raw token, sent to the client
  tokenHash: string; // persisted in RefreshToken.tokenHash
  expiresAt: Date;
}

// Wraps JWT signing (access tokens) and opaque refresh-token generation/hashing behind one port.
// Refresh tokens are deliberately NOT JWTs: they are random opaque strings whose SHA-256 hash is
// stored in `RefreshToken.tokenHash` (docs/architecture/02-database-design.md), so a compromised
// database dump alone cannot be used to mint a valid refresh token, and revocation is a simple row
// update rather than a token-blocklist.
export interface ITokenService {
  signAccessToken(claims: AccessTokenClaims): string;
  generateRefreshToken(): GeneratedRefreshToken;
  hashRefreshToken(token: string): string;
}
