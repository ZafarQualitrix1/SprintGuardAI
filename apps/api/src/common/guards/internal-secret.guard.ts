import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Guards internal, non-user-facing endpoints (e.g. the integration health-check sweep) that are
// invoked by a scheduler rather than a logged-in user, so JwtAuthGuard/PermissionsGuard don't
// apply -- protect with a shared secret instead. Uses the same "Authorization: Bearer <secret>"
// header shape Vercel's own CRON_SECRET mechanism auto-attaches, so this stays compatible if a
// native Vercel Cron is ever wired up instead of (or alongside) the GitHub Actions scheduler.
@Injectable()
export class InternalSecretGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.configService.get<string>('internal.cronSecret');
    if (!expected) {
      throw new UnauthorizedException('INTERNAL_CRON_SECRET is not configured on this deployment');
    }

    const request = context.switchToHttp().getRequest();
    const header = request.headers['authorization'] as string | undefined;
    if (header !== `Bearer ${expected}`) {
      throw new UnauthorizedException();
    }

    return true;
  }
}
