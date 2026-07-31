import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IMembershipRepository } from '../../domain/repositories/membership.repository.interface';
import { toMembershipEntity } from '../mappers';

@Injectable()
export class PrismaMembershipRepository implements IMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPrimaryByUserId(userId: string) {
    // relationLoadStrategy 'join': this runs on every authenticated request (JwtStrategy.validate,
    // by design, re-checks permissions fresh every time rather than trusting the JWT -- see that
    // file's comment). Without this, Prisma resolves the 4-level nested include as ~7 sequential
    // round trips instead of one JOIN, which is the dominant cost behind "slow API" reports
    // (measured ~9 round trips / ~5s down to ~4 / ~2.7s on the equivalent login query).
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        organization: true,
        role: { include: { rolePermissions: { include: { permission: true } } } },
      },
      relationLoadStrategy: 'join',
    });
    return membership ? toMembershipEntity(membership) : null;
  }
}
