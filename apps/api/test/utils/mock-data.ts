// Shared fixture builders matching the exact Prisma `include` shape each repository's mapper
// expects (see e.g. apps/api/src/modules/iam/infrastructure/mappers/iam.mapper.ts). Kept in one
// place so a schema/mapper change only needs updating here, not in every e2e spec.

export function buildUserRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-1',
    email: 'jane@acme.com',
    passwordHash: null,
    fullName: 'Jane Doe',
    avatarUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

export function buildMembershipRow(
  overrides: {
    organizationId?: string;
    organizationName?: string;
    userId?: string;
    roleKey?: string;
    permissions?: string[];
  } = {},
) {
  const organizationId = overrides.organizationId ?? 'org-1';
  const permissions = overrides.permissions ?? [];

  return {
    id: 'membership-1',
    organizationId,
    userId: overrides.userId ?? 'user-1',
    roleId: 'role-1',
    createdAt: new Date(),
    organization: {
      id: organizationId,
      name: overrides.organizationName ?? 'Acme Corp',
      slug: 'acme-corp',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    },
    role: {
      id: 'role-1',
      key: overrides.roleKey ?? 'OWNER',
      name: 'Owner',
      isSystem: true,
      createdAt: new Date(),
      rolePermissions: permissions.map((key, index) => ({
        roleId: 'role-1',
        permissionId: `permission-${index}`,
        permission: { id: `permission-${index}`, key, description: '' },
      })),
    },
  };
}
