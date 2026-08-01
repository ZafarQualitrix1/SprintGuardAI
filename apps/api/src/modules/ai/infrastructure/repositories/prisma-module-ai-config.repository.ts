import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  IModuleAiConfigRepository,
  ModuleAiConfigRecord,
  UpsertModuleAiConfigInput,
} from '../../domain/repositories/module-ai-config.repository.interface';

@Injectable()
export class PrismaModuleAiConfigRepository implements IModuleAiConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrgAndCapability(organizationId: string, capability: string): Promise<ModuleAiConfigRecord | null> {
    return this.prisma.moduleAiConfig.findUnique({
      where: { organizationId_capability: { organizationId, capability } },
    });
  }

  async listByOrg(organizationId: string): Promise<ModuleAiConfigRecord[]> {
    return this.prisma.moduleAiConfig.findMany({ where: { organizationId } });
  }

  async upsert(input: UpsertModuleAiConfigInput): Promise<ModuleAiConfigRecord> {
    const { organizationId, capability, ...rest } = input;
    return this.prisma.moduleAiConfig.upsert({
      where: { organizationId_capability: { organizationId, capability } },
      create: { organizationId, capability, ...rest },
      update: rest,
    });
  }
}
