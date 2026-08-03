import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
} from '../../domain/repositories/organization-member.repository.interface';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';

export class RemoveMemberCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly userId: string,
  ) {}
}

@CommandHandler(RemoveMemberCommand)
export class RemoveMemberHandler implements ICommandHandler<RemoveMemberCommand, void> {
  constructor(
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly repository: IOrganizationMemberRepository,
    private readonly auditLog: OrgSettingsAuditLogService,
  ) {}

  async execute(command: RemoveMemberCommand): Promise<void> {
    if (command.userId === command.actorId) {
      throw new BadRequestException('You cannot remove yourself from the organization.');
    }

    const members = await this.repository.listByOrg(command.organizationId);
    const target = members.find((m) => m.userId === command.userId);
    if (target?.roleKey === 'OWNER') {
      const owners = await this.repository.countOwners(command.organizationId);
      if (owners <= 1) {
        throw new BadRequestException('Cannot remove the only Owner -- assign another Owner first.');
      }
    }

    await this.repository.remove(command.organizationId, command.userId);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'member.removed',
      'Membership',
      command.userId,
    );
  }
}
