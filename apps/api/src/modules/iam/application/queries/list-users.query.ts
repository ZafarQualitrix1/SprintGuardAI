import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';

export interface AdminUserSummary {
  id: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: string | null;
  roleKey: string;
  roleName: string;
  permissions: string[];
  createdAt: string;
}

export interface ListUsersFilters {
  search?: string;
  roleKey?: string;
  isActive?: boolean;
}

export class ListUsersQuery {
  constructor(
    public readonly organizationId: string,
    public readonly filters: ListUsersFilters,
  ) {}
}

@QueryHandler(ListUsersQuery)
export class ListUsersHandler implements IQueryHandler<ListUsersQuery, AdminUserSummary[]> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListUsersQuery): Promise<AdminUserSummary[]> {
    const rows = await this.prisma.membership.findMany({
      where: {
        organizationId: query.organizationId,
        ...(query.filters.roleKey ? { role: { key: query.filters.roleKey } } : {}),
        user: {
          deletedAt: null,
          ...(query.filters.isActive !== undefined ? { isActive: query.filters.isActive } : {}),
          ...(query.filters.search
            ? {
                OR: [
                  { email: { contains: query.filters.search, mode: 'insensitive' } },
                  { fullName: { contains: query.filters.search, mode: 'insensitive' } },
                ],
              }
            : {}),
        },
      },
      include: {
        user: true,
        role: { include: { rolePermissions: { include: { permission: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return rows.map((row) => ({
      id: row.user.id,
      email: row.user.email,
      fullName: row.user.fullName,
      isActive: row.user.isActive,
      lastLoginAt: row.user.lastLoginAt?.toISOString() ?? null,
      roleKey: row.role.key,
      roleName: row.role.name,
      permissions: row.role.rolePermissions.map((rp) => rp.permission.key),
      createdAt: row.user.createdAt.toISOString(),
    }));
  }
}
