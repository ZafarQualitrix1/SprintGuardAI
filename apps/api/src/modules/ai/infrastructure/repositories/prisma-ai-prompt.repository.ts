import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { IAiPromptRepository } from '../../domain/repositories/ai-prompt.repository.interface';

@Injectable()
export class PrismaAiPromptRepository implements IAiPromptRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveByCapability(capability: string) {
    const row = await this.prisma.aiPrompt.findFirst({ where: { capability, isActive: true } });
    if (!row) return null;
    return {
      id: row.id,
      capability: row.capability,
      version: row.version,
      template: row.template,
      templateHash: row.templateHash,
    };
  }
}
