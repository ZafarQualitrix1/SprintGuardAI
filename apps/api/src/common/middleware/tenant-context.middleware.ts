import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { TenantContext } from '../context/tenant-context';

interface AccessTokenPayload {
  sub: string;
  orgId: string;
}

// Populates TenantContext for every request from the Bearer JWT, before any guard/controller runs.
// Public routes (login, health checks) simply have no organizationId in context, which the
// TenantScopedRepository base class treats as "no tenant-scoped query permitted".
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      next();
      return;
    }

    try {
      const payload = this.jwtService.decode(token) as AccessTokenPayload | null;
      if (!payload?.orgId) {
        next();
        return;
      }

      TenantContext.run(
        {
          organizationId: payload.orgId,
          userId: payload.sub,
          correlationId: (req as unknown as { correlationId?: string }).correlationId,
        },
        next,
      );
    } catch {
      // Invalid/expired token: let JwtAuthGuard reject the request with 401 further down the chain.
      next();
    }
  }
}
