import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IUserRepository, UserWithPrimaryMembership } from '../../domain/repositories/user.repository.interface';
import { toUserEntity, toMembershipEntity } from '../mappers';

const membershipInclude = {
  organization: true,
  role: { include: { rolePermissions: { include: { permission: true } } } },
} as const;

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toUserEntity(user) : null;
  }

  async findByEmailWithPrimaryMembership(email: string): Promise<UserWithPrimaryMembership | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: { include: membershipInclude, orderBy: { createdAt: 'asc' }, take: 1 },
      },
    });
    if (!user) {
      return null;
    }

    const [primaryMembership] = user.memberships;
    return {
      user: toUserEntity(user),
      membership: primaryMembership ? toMembershipEntity(primaryMembership) : null,
    };
  }

  async findByIdWithMembership(
    userId: string,
    organizationId: string,
  ): Promise<UserWithPrimaryMembership | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: { where: { organizationId }, include: membershipInclude, take: 1 },
      },
    });
    if (!user) {
      return null;
    }

    const [membership] = user.memberships;
    return {
      user: toUserEntity(user),
      membership: membership ? toMembershipEntity(membership) : null,
    };
  }
}
