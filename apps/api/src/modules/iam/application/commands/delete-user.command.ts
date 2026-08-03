import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { REFRESH_TOKEN_REPOSITORY, IRefreshTokenRepository } from '../../domain/repositories';
import { IamAuditLogService } from '../../infrastructure/services/iam-audit-log.service';

export class DeleteUserCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly targetUserId: string,
  ) {}
}

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand, void> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REFRESH_TOKEN_REPOSITORY) private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly auditLog: IamAuditLogService,
  ) {}

  async execute(command: DeleteUserCommand): Promise<void> {
    if (command.targetUserId === command.actorId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: command.organizationId, userId: command.targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this organization');
    }

    await this.prisma.user.update({
      where: { id: command.targetUserId },
      data: { isActive: false, deletedAt: new Date() },
    });
    await this.refreshTokenRepository.revokeAllForUser(command.targetUserId);

    await this.auditLog.record(command.organizationId, command.actorId, 'user.deleted', 'User', command.targetUserId);
  }
}
