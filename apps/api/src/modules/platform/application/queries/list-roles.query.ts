import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';

export interface RoleSummary {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
  permissions: string[];
}

export interface PermissionCatalogEntry {
  key: string;
  description: string;
}

export interface RolesAndPermissions {
  roles: RoleSummary[];
  permissions: PermissionCatalogEntry[];
}

// Backs Admin Console's "Roles & Permissions" matrix -- real Role/Permission/RolePermission data,
// not the spec's aspirational 19-module x 8-action grid (this pass extends the existing coarse
// catalog with a few real new keys instead of seeding ~150 unenforced permissions).
export class ListRolesQuery {}

@QueryHandler(ListRolesQuery)
export class ListRolesHandler implements IQueryHandler<ListRolesQuery, RolesAndPermissions> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(): Promise<RolesAndPermissions> {
    const [roles, permissions] = await Promise.all([
      this.prisma.role.findMany({
        include: { rolePermissions: { include: { permission: true } } },
        orderBy: { key: 'asc' },
      }),
      this.prisma.permission.findMany({ orderBy: { key: 'asc' } }),
    ]);

    return {
      roles: roles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        isSystem: role.isSystem,
        permissions: role.rolePermissions.map((rp) => rp.permission.key),
      })),
      permissions: permissions.map((p) => ({ key: p.key, description: p.description })),
    };
  }
}
