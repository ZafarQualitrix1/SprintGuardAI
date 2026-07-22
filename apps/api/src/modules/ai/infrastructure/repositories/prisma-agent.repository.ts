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
}
