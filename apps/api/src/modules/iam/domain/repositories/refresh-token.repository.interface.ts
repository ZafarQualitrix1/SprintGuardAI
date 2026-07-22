export const REFRESH_TOKEN_REPOSITORY = Symbol('IRefreshTokenRepository');

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface IRefreshTokenRepository {
  create(params: { userId: string; tokenHash: string; expiresAt: Date }): Promise<RefreshTokenRecord>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  revoke(id: string, replacedByTokenId?: string): Promise<void>;
}
