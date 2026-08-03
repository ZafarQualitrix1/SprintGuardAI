import { Inject, UnauthorizedException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { USER_REPOSITORY, IUserRepository } from '../../domain/repositories';
import {
  MEMBERSHIP_REPOSITORY,
  IMembershipRepository,
  REFRESH_TOKEN_REPOSITORY,
  IRefreshTokenRepository,
} from '../../domain/repositories';
import { TOKEN_SERVICE, ITokenService } from '../ports/token.port';
import { AuthSessionResult } from './auth-session.types';

export class RefreshSessionCommand {
  constructor(public readonly refreshToken: string) {}
}

@CommandHandler(RefreshSessionCommand)
export class RefreshSessionHandler implements ICommandHandler<RefreshSessionCommand, AuthSessionResult> {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepository: IMembershipRepository,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
  ) {}

  async execute(command: RefreshSessionCommand): Promise<AuthSessionResult> {
    const tokenHash = this.tokenService.hashRefreshToken(command.refreshToken);
    const existing = await this.refreshTokenRepository.findByHash(tokenHash);

    if (!existing || existing.revokedAt || existing.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token is invalid or has expired');
    }

    const membership = await this.membershipRepository.findPrimaryByUserId(existing.userId);
    const userResult = membership
      ? await this.userRepository.findByIdWithMembership(existing.userId, membership.organizationId)
      : null;

    if (!membership || !userResult?.user.isActive) {
      throw new UnauthorizedException('Account is no longer active');
    }

    // Rotation: the presented refresh token is revoked and replaced atomically, so a stolen,
    // already-used refresh token can never be replayed (Solution Architecture §25).
    const nextRefresh = this.tokenService.generateRefreshToken();
    const created = await this.refreshTokenRepository.create({
      userId: existing.userId,
      tokenHash: nextRefresh.tokenHash,
      expiresAt: nextRefresh.expiresAt,
    });
    await this.refreshTokenRepository.revoke(existing.id, created.id);

    const accessToken = this.tokenService.signAccessToken({
      sub: existing.userId,
      orgId: membership.organizationId,
    });

    return {
      accessToken,
      refreshToken: nextRefresh.token,
      refreshTokenExpiresAt: nextRefresh.expiresAt,
      user: {
        id: userResult.user.id,
        email: userResult.user.email,
        fullName: userResult.user.fullName,
        avatarUrl: userResult.user.avatarUrl,
        organizationId: membership.organizationId,
        organizationName: membership.organizationName,
        roleKey: membership.roleKey,
        permissions: [...membership.permissions],
      },
    };
  }
}
