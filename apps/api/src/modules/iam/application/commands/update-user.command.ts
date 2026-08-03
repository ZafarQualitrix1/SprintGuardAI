import { NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { IamAuditLogService } from '../../infrastructure/services/iam-audit-log.service';

export interface UpdateUserInput {
  fullName?: string;
}

export class UpdateUserCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly targetUserId: string,
    public readonly input: UpdateUserInput,
  ) {}
}

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand, { id: string; fullName: string }> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: IamAuditLogService,
  ) {}

  async execute(command: UpdateUserCommand): Promise<{ id: string; fullName: string }> {
    const membership = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId: command.organizationId, userId: command.targetUserId } },
    });
    if (!membership) {
      throw new NotFoundException('User not found in this organization');
    }

    const user = await this.prisma.user.update({
      where: { id: command.targetUserId },
      data: { fullName: command.input.fullName },
    });

    await this.auditLog.record(command.organizationId, command.actorId, 'user.updated', 'User', user.id);

    return { id: user.id, fullName: user.fullName };
  }
}
