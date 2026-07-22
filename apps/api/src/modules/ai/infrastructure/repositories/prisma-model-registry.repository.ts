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
}
