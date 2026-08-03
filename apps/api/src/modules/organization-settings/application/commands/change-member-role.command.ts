import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import {
  IOrganizationMemberRepository,
  ORGANIZATION_MEMBER_REPOSITORY,
  OrganizationMemberRecord,
} from '../../domain/repositories/organization-member.repository.interface';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';

export class ChangeMemberRoleCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly userId: string,
    public readonly roleKey: string,
  ) {}
}

@CommandHandler(ChangeMemberRoleCommand)
export class ChangeMemberRoleHandler implements ICommandHandler<ChangeMemberRoleCommand, OrganizationMemberRecord> {
  constructor(
    @Inject(ORGANIZATION_MEMBER_REPOSITORY) private readonly repository: IOrganizationMemberRepository,
    private readonly prisma: PrismaService,
    private readonly auditLog: OrgSettingsAuditLogService,
  ) {}

  async execute(command: ChangeMemberRoleCommand): Promise<OrganizationMemberRecord> {
    const role = await this.prisma.role.findUnique({ where: { key: command.roleKey } });
    if (!role) {
      throw new NotFoundException(`Unknown role "${command.roleKey}"`);
    }

    // Never allow the org's last OWNER to be demoted -- would leave the organization with no
    // member able to manage ownership-level settings.
    if (role.key !== 'OWNER') {
      const owners = await this.repository.countOwners(command.organizationId);
      const members = await this.repository.listByOrg(command.organizationId);
      const target = members.find((m) => m.userId === command.userId);
      if (target?.roleKey === 'OWNER' && owners <= 1) {
        throw new BadRequestException('Cannot demote the only Owner -- assign another Owner first.');
      }
    }

    const updated = await this.repository.changeRole(command.organizationId, command.userId, role.id);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'member.role_changed',
      'Membership',
      updated.membershipId,
      undefined,
      { userId: command.userId, newRole: command.roleKey },
    );

    return updated;
  }
}
