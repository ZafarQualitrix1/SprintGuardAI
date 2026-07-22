import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenClaims,
  GeneratedRefreshToken,
  ITokenService,
} from '../../application/ports/token.port';

const REFRESH_TOKEN_BYTES = 48;
const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class JwtTokenService implements ITokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(claims: AccessTokenClaims): string {
    // Uses the global JwtModule's default secret/TTL (app.module.ts, auth.accessSecret/accessTtl) --
    // no override needed since access tokens always use the same signing config.
    return this.jwtService.sign(claims);
  }

  generateRefreshToken(): GeneratedRefreshToken {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000),
    };
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
