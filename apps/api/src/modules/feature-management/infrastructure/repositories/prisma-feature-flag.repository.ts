import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  FeatureFlagRecord,
  IFeatureFlagRepository,
  UpsertFeatureFlagInput,
} from '../../domain/repositories/feature-flag.repository.interface';

const withOverrides = { overrides: true } as const;

@Injectable()
export class PrismaFeatureFlagRepository implements IFeatureFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listAll(): Promise<FeatureFlagRecord[]> {
    const rows = await this.prisma.featureFlag.findMany({ include: withOverrides, orderBy: { key: 'asc' } });
    return rows;
  }

  async upsert(key: string, input: UpsertFeatureFlagInput): Promise<FeatureFlagRecord> {
    return this.prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        description: input.description,
        defaultValue: input.defaultValue as Prisma.InputJsonValue,
        isBeta: input.isBeta ?? false,
      },
      update: {
        ...(input.description !== undefined ? { description: input.description } : {}),
        defaultValue: input.defaultValue as Prisma.InputJsonValue,
        ...(input.isBeta !== undefined ? { isBeta: input.isBeta } : {}),
      },
      include: withOverrides,
    });
  }

  async setOrgOverride(
    key: string,
    organizationId: string,
    value: unknown,
    rolloutPercentage: number,
  ): Promise<FeatureFlagRecord> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      throw new NotFoundException(`Unknown feature flag "${key}"`);
    }

    const existing = await this.prisma.featureFlagOverride.findFirst({ where: { flagId: flag.id, organizationId } });
    if (existing) {
      await this.prisma.featureFlagOverride.update({
        where: { id: existing.id },
        data: { value: value as Prisma.InputJsonValue, rolloutPercentage },
      });
    } else {
      await this.prisma.featureFlagOverride.create({
        data: { flagId: flag.id, organizationId, value: value as Prisma.InputJsonValue, rolloutPercentage },
      });
    }

    return this.prisma.featureFlag.findUniqueOrThrow({ where: { key }, include: withOverrides });
  }

  async removeOrgOverride(key: string, organizationId: string): Promise<FeatureFlagRecord> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      throw new NotFoundException(`Unknown feature flag "${key}"`);
    }
    await this.prisma.featureFlagOverride.deleteMany({ where: { flagId: flag.id, organizationId } });
    return this.prisma.featureFlag.findUniqueOrThrow({ where: { key }, include: withOverrides });
  }
}
