import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { IamAuditLogService } from '../../infrastructure/services/iam-audit-log.service';

export class SetUserActiveCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly targetUserId: string,
    public readonly isActive: boolean,
  ) {}
}

@CommandHandler(SetUserActiveCommand)
export class SetUserActiveHandler implements ICommandHandler<SetUserActiveCommand, { id: string; isActive: boolean }> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLog: IamAuditLogService,
  ) {}

  async execute(command: SetUserActiveCommand): Promise<{ id: string; isActive: boolean }> {
    if (command.targetUserId === command.actorId && !command.isActive) {
      throw new BadRequestException('You cannot suspend your own account.');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: command.organizationId, userId: command.targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this organization');
    }

    const user = await this.prisma.user.update({
      where: { id: command.targetUserId },
      data: { isActive: command.isActive },
    });

    if (!command.isActive) {
      await this.refreshTokenRepository.revokeAllForUser(command.targetUserId);
    }

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      command.isActive ? 'user.activated' : 'user.suspended',
      'User',
      user.id,
    );

    return { id: user.id, isActive: user.isActive };
  }
}
