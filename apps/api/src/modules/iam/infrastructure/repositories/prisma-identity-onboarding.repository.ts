import { randomBytes } from 'crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  IIdentityOnboardingRepository,
  OnboardOrganizationInput,
  OnboardOrganizationResult,
} from '../../domain/repositories/identity-onboarding.repository.interface';
import { toUserEntity, toMembershipEntity } from '../mappers';

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const suffix = randomBytes(3).toString('hex');
  return `${base || 'org'}-${suffix}`;
}

@Injectable()
export class PrismaIdentityOnboardingRepository implements IIdentityOnboardingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registerOrganizationOwner(
    input: OnboardOrganizationInput,
  ): Promise<OnboardOrganizationResult> {
    const ownerRole = await this.prisma.role.findUnique({ where: { key: 'OWNER' } });
    if (!ownerRole) {
      // The RBAC catalog (packages/database/prisma/seed.ts) has not been seeded yet -- this is an
      // environment setup error, not a user-facing one.
      throw new InternalServerErrorException(
        'RBAC roles are not seeded. Run `pnpm db:seed` before registering an organization.',
      );
    }

    const { user, organization } = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: input.organizationName, slug: slugify(input.organizationName) },
      });

      const user = await tx.user.create({
        data: {
          email: input.email,
          fullName: input.fullName,
          passwordHash: input.passwordHash,
        },
      });

      await tx.membership.create({
        data: { organizationId: organization.id, userId: user.id, roleId: ownerRole.id },
      });

      return { user, organization };
    });

    const membership = await this.prisma.membership.findFirstOrThrow({
      where: { userId: user.id, organizationId: organization.id },
      include: {
        organization: true,
        role: { include: { rolePermissions: { include: { permission: true } } } },
      },
      relationLoadStrategy: 'join',
    });

    return {
      user: toUserEntity(user),
      organizationId: organization.id,
      membership: toMembershipEntity(membership),
    };
  }
}
