import { createHash } from 'crypto';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { USER_REPOSITORY, IUserRepository, REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { PASSWORD_HASHER, IPasswordHasher } from '../ports/password-hasher.port';
import { TOKEN_SERVICE, ITokenService } from '../ports/token.port';
import { IamAuditLogService } from '../../infrastructure/services/iam-audit-log.service';
import { AuthSessionResult } from './auth-session.types';

export class ResetPasswordCommand {
  constructor(
    public readonly token: string,
    public readonly password: string,
  ) {}
}

// Consumes a ForgotPasswordCommand-issued token (same tokenHash pattern as AcceptInvitationHandler)
// and, on success, logs the user straight into a fresh session -- matching the accept-invitation
// UX of "consume token, land signed in" rather than bouncing back to a separate login step.
@CommandHandler(ResetPasswordCommand)
export class ResetPasswordHandler implements ICommandHandler<ResetPasswordCommand, AuthSessionResult> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(USER_REPOSITORY) private readonly userRepository: IUserRepository,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(TOKEN_SERVICE) private readonly tokenService: ITokenService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLog: IamAuditLogService,
  ) {}

  async execute(command: ResetPasswordCommand): Promise<AuthSessionResult> {
    const tokenHash = createHash('sha256').update(command.token).digest('hex');
    const resetToken = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });

    if (!resetToken || resetToken.consumedAt) {
      throw new NotFoundException('This reset link is invalid or has already been used.');
    }
    if (resetToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('This reset link has expired -- request a new one.');
    }

    const targetUser = await this.prisma.user.findUniqueOrThrow({ where: { id: resetToken.userId } });
    const passwordHash = await this.passwordHasher.hash(command.password);

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { consumedAt: new Date() } }),
      this.prisma.passwordResetToken.deleteMany({
        where: { userId: resetToken.userId, consumedAt: null, id: { not: resetToken.id } },
      }),
    ]);

    // Password reset invalidates every existing session -- a stolen refresh token from before the
    // reset shouldn't survive it (same defense-in-depth as the admin-triggered reset flow).
    await this.refreshTokenRepository.revokeAllForUser(resetToken.userId);

    const result = await this.userRepository.findByEmailWithPrimaryMembership(targetUser.email);
    if (!result || !result.membership) {
      throw new NotFoundException('Account is no longer available.');
    }
    const { user, membership } = result;

    await this.auditLog.record(membership.organizationId, user.id, 'auth.password_reset', 'User', user.id);

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
