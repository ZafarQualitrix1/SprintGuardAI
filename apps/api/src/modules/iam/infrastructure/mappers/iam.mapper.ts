import type { Membership, Organization, Role, RolePermission, Permission, User } from '@sprintguard/database';
import { UserEntity } from '../../domain/entities/user.entity';
import { MembershipEntity } from '../../domain/entities/membership.entity';

type MembershipWithRelations = Membership & {
  organization: Organization;
  role: Role & { rolePermissions: (RolePermission & { permission: Permission })[] };
};

export function toUserEntity(user: User): UserEntity {
  return new UserEntity(user.id, user.email, user.fullName, user.passwordHash, user.isActive);
}

export function toMembershipEntity(membership: MembershipWithRelations): MembershipEntity {
  return new MembershipEntity(
    membership.userId,
    membership.organizationId,
    membership.organization.name,
    membership.role.key,
    membership.role.rolePermissions.map((rp) => rp.permission.key),
  );
}
