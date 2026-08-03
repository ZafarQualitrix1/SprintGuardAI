import { randomBytes } from 'crypto';
import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { PASSWORD_HASHER, IPasswordHasher } from '../ports/password-hasher.port';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { IamAuditLogService } from '../../infrastructure/services/iam-audit-log.service';

export interface ResetUserPasswordResult {
  // Returned once, never persisted in plaintext -- no email delivery exists yet, so the admin
  // shares this with the user out-of-band (same honest workaround as member invitations).
  temporaryPassword: string;
}

export class ResetUserPasswordCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly targetUserId: string,
  ) {}
}

@CommandHandler(ResetUserPasswordCommand)
export class ResetUserPasswordHandler implements ICommandHandler<ResetUserPasswordCommand, ResetUserPasswordResult> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PASSWORD_HASHER) private readonly passwordHasher: IPasswordHasher,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLog: IamAuditLogService,
  ) {}

  async execute(command: ResetUserPasswordCommand): Promise<ResetUserPasswordResult> {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: command.organizationId, userId: command.targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this organization');
    }

    const temporaryPassword = randomBytes(9).toString('base64url'); // 12 chars, URL-safe
    const passwordHash = await this.passwordHasher.hash(temporaryPassword);

    await this.prisma.user.update({ where: { id: command.targetUserId }, data: { passwordHash } });
    await this.refreshTokenRepository.revokeAllForUser(command.targetUserId);

    await this.auditLog.record(command.organizationId, command.actorId, 'user.password_reset', 'User', command.targetUserId);

    return { temporaryPassword };
  }
}
