import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  IOrganizationMemberRepository,
  OrganizationMemberRecord,
} from '../../domain/repositories/organization-member.repository.interface';

const withUserAndRole = { user: true, role: true } as const;

function toRecord(row: {
  id: string;
  userId: string;
  roleId: string;
  createdAt: Date;
  user: { email: string; fullName: string; isActive: boolean; lastLoginAt: Date | null };
  role: { key: string; name: string };
}): OrganizationMemberRecord {
  return {
    membershipId: row.id,
    userId: row.userId,
    email: row.user.email,
    fullName: row.user.fullName,
    isActive: row.user.isActive,
    lastLoginAt: row.user.lastLoginAt,
    roleId: row.roleId,
    roleKey: row.role.key,
    roleName: row.role.name,
    createdAt: row.createdAt,
  };
}

@Injectable()
export class PrismaOrganizationMemberRepository implements IOrganizationMemberRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listByOrg(organizationId: string): Promise<OrganizationMemberRecord[]> {
    const rows = await this.prisma.membership.findMany({
      where: { organizationId },
      include: withUserAndRole,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toRecord);
  }

  async changeRole(organizationId: string, userId: string, roleId: string): Promise<OrganizationMemberRecord> {
    const existing = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!existing) {
      throw new NotFoundException('Member not found in this organization');
    }
    const row = await this.prisma.membership.update({
      where: { id: existing.id },
      data: { roleId },
      include: withUserAndRole,
    });
    return toRecord(row);
  }

  async remove(organizationId: string, userId: string): Promise<void> {
    const existing = await this.prisma.membership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!existing) {
      throw new NotFoundException('Member not found in this organization');
    }
    await this.prisma.membership.delete({ where: { id: existing.id } });
  }

  async countOwners(organizationId: string): Promise<number> {
    return this.prisma.membership.count({ where: { organizationId, role: { key: 'OWNER' } } });
  }
}
