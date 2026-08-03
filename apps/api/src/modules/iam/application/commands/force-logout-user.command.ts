import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { IamAuditLogService } from '../../infrastructure/services/iam-audit-log.service';

export class ForceLogoutUserCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly targetUserId: string,
  ) {}
}

@CommandHandler(ForceLogoutUserCommand)
export class ForceLogoutUserHandler implements ICommandHandler<ForceLogoutUserCommand, void> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLog: IamAuditLogService,
  ) {}

  async execute(command: ForceLogoutUserCommand): Promise<void> {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: command.organizationId, userId: command.targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this organization');
    }

    await this.refreshTokenRepository.revokeAllForUser(command.targetUserId);
    await this.auditLog.record(command.organizationId, command.actorId, 'user.force_logout', 'User', command.targetUserId);
  }
}
