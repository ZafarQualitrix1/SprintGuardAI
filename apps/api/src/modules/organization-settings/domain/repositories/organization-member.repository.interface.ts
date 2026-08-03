export const ORGANIZATION_MEMBER_REPOSITORY = Symbol('IOrganizationMemberRepository');

export interface OrganizationMemberRecord {
  membershipId: string;
  userId: string;
  email: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  roleId: string;
  roleKey: string;
  roleName: string;
  createdAt: Date;
}

export interface IOrganizationMemberRepository {
  listByOrg(organizationId: string): Promise<OrganizationMemberRecord[]>;
  changeRole(organizationId: string, userId: string, roleId: string): Promise<OrganizationMemberRecord>;
  remove(organizationId: string, userId: string): Promise<void>;
  countOwners(organizationId: string): Promise<number>;
}
