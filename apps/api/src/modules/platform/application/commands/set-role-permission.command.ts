import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';
import { PlatformAuditLogService } from '../../infrastructure/services/platform-audit-log.service';

export class SetRolePermissionCommand {
  constructor(
    public readonly actorOrganizationId: string,
    public readonly actorId: string,
    public readonly roleKey: string,
    public readonly permissionKey: string,
    public readonly granted: boolean,
  ) {}
}

@CommandHandler(SetRolePermissionCommand)
export class SetRolePermissionHandler implements ICommandHandler<SetRolePermissionCommand, { roleKey: string; permissions: string[] }> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: PlatformAuditLogService,
  ) {}

  async execute(command: SetRolePermissionCommand): Promise<{ roleKey: string; permissions: string[] }> {
    const role = await this.prisma.role.findUnique({ where: { key: command.roleKey } });
    if (!role) {
      throw new NotFoundException(`Unknown role "${command.roleKey}"`);
    }
    // OWNER must always retain every permission -- it's the one role guaranteed to be able to
    // recover any other misconfiguration, including its own.
    if (role.key === 'OWNER' && !command.granted) {
      throw new BadRequestException('The Owner role must always retain full access.');
    }

    const permission = await this.prisma.permission.findUnique({ where: { key: command.permissionKey } });
    if (!permission) {
      throw new NotFoundException(`Unknown permission "${command.permissionKey}"`);
    }

    if (command.granted) {
      await this.prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    } else {
      await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id, permissionId: permission.id } });
    }

    await this.auditLog.record(
      command.actorOrganizationId,
      command.actorId,
      command.granted ? 'role.permission_granted' : 'role.permission_revoked',
      'Role',
      role.id,
      undefined,
      { roleKey: command.roleKey, permissionKey: command.permissionKey },
    );

    const updated = await this.prisma.rolePermission.findMany({ where: { roleId: role.id }, include: { permission: true } });
    return { roleKey: role.key, permissions: updated.map((rp) => rp.permission.key) };
  }
}
