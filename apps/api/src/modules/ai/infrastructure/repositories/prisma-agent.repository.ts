import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';

@Injectable()
export class PrismaAgentRepository implements IAgentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByKey(key: string) {
    const row = await this.prisma.agent.findUnique({ where: { key } });
    return row ? { id: row.id, key: row.key } : null;
  }

  async findByCapability(capability: string) {
    const row = await this.prisma.agent.findFirst({ where: { capabilities: { array_contains: capability } } });
    return row ? { id: row.id, key: row.key } : null;
  }

  async appendCapability(agentId: string, capability: string) {
    const row = await this.prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
    const capabilities = (row.capabilities as string[]) ?? [];
    if (!capabilities.includes(capability)) {
      await this.prisma.agent.update({
        where: { id: agentId },
        data: { capabilities: [...capabilities, capability] },
      });
    }
  }
}
