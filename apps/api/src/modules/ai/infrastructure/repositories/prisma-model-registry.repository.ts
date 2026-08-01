import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IModelRegistryRepository } from '../../domain/repositories/model-registry.repository.interface';

@Injectable()
export class PrismaModelRegistryRepository implements IModelRegistryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveForCapability(provider: string, capability: string) {
    const rows = await this.prisma.modelRegistryEntry.findMany({ where: { provider, isActive: true } });
    const match = rows.find((row) => (row.allowedCapabilities as string[]).includes(capability));
    return match ? { id: match.id, provider: match.provider, model: match.model } : null;
  }

  async listAll() {
    const rows = await this.prisma.modelRegistryEntry.findMany({ orderBy: [{ provider: 'asc' }, { model: 'asc' }] });
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      model: row.model,
      version: row.version,
      allowedCapabilities: row.allowedCapabilities as string[],
      costTier: row.costTier,
      isActive: row.isActive,
    }));
  }
}
