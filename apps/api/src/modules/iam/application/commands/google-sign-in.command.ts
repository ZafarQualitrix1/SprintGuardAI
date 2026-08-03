import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { USER_REPOSITORY, IUserRepository, REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { TOKEN_SERVICE, ITokenService } from '../ports/token.port';
import { GOOGLE_IDENTITY_VERIFIER, IGoogleIdentityVerifier } from '../ports/google-identity-verifier.port';
import { AuthSessionResult } from './auth-session.types';

export class GoogleSignInCommand {
  // Google Identity Services ID token (JWT), verified server-side -- never trusted client claims.
  constructor(public readonly credential: string) {}
}

// No password check: Google has already verified the user controls that email address. This
// intentionally does NOT auto-create an account/organization on a first-time Google sign-in (see
// login page copy) -- account creation stays through /register or an org invitation, so this
// can't reopen the duplicate-organization-on-signup bug that was fixed separately.
@CommandHandler(GoogleSignInCommand)
export class GoogleSignInHandler implements ICommandHandler<GoogleSignInCommand, AuthSessionResult> {
  constructor(
    @Inject(GOOGLE_IDENTITY_VERIFIER) private readonly googleIdentityVerifier: IGoogleIdentityVerifier,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(command: GoogleSignInCommand): Promise<AuthSessionResult> {
    const identity = await this.googleIdentityVerifier.verify(command.credential);
    if (!identity.emailVerified) {
      throw new UnauthorizedException('Your Google account email is not verified.');
    }

    const result = await this.userRepository.findByEmailWithPrimaryMembership(identity.email);
    if (!result || !result.membership || !result.user.isActive) {
      throw new UnauthorizedException(
        `No SprintGuard AI account exists for ${identity.email}. Register an organization or ask an admin to invite you.`,
      );
    }
    const { user, membership } = result;

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorId: user.id,
        action: 'auth.google_login',
        targetType: 'User',
        targetId: user.id,
      },
    });

    const accessToken = this.tokenService.signAccessToken({ sub: user.id, orgId: membership.organizationId });
    const refresh = this.tokenService.generateRefreshToken();
    await this.refreshTokenRepository.create({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      refreshTokenExpiresAt: refresh.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        organizationId: membership.organizationId,
        organizationName: membership.organizationName,
        roleKey: membership.roleKey,
        permissions: [...membership.permissions],
      },
    };
  }
}
