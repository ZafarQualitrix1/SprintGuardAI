import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { toMembershipEntity } from '../mappers';

@Injectable()
export class PrismaMembershipRepository implements IMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPrimaryByUserId(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        organization: true,
        role: { include: { rolePermissions: { include: { permission: true } } } },
      },
    });
    return membership ? toMembershipEntity(membership) : null;
  }
}
