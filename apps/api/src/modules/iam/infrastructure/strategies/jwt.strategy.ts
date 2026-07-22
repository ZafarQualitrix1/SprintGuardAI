import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccessTokenClaims } from '../../application/ports/token.port';
import {
  MEMBERSHIP_REPOSITORY,
  IMembershipRepository,
} from '../../domain/repositories/membership.repository.interface';
import { AuthenticatedUser } from '../../../../common/decorators/current-user.decorator';

// Passport 'jwt' strategy delegated to by the global JwtAuthGuard (common/guards/jwt-auth.guard.ts).
// Deliberately re-resolves permissions from the database on every request rather than trusting a
// permissions claim baked into the JWT -- a role/permission change takes effect immediately instead
// of waiting for the access token to expire (Solution Architecture §25).
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepository: IMembershipRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('auth.accessSecret'),
    });
  }

  async validate(payload: AccessTokenClaims): Promise<AuthenticatedUser> {
    const membership = await this.membershipRepository.findPrimaryByUserId(payload.sub);

    if (!membership || membership.organizationId !== payload.orgId) {
      throw new UnauthorizedException('Session is no longer valid');
    }

    return {
      userId: payload.sub,
      organizationId: membership.organizationId,
      roleKey: membership.roleKey,
      permissions: [...membership.permissions],
    };
  }
}
