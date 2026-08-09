import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CompleteAgentRunInput,
  IAgentRunRepository,
  StartAgentRunInput,
} from '../../domain/repositories/agent-run.repository.interface';

@Injectable()
export class PrismaAgentRunRepository implements IAgentRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async start(input: StartAgentRunInput) {
    const row = await this.prisma.agentRun.create({
      data: {
        agentId: input.agentId,
        organizationId: input.organizationId,
        correlationId: input.correlationId,
        status: 'RUNNING',
        input: input.input as Prisma.InputJsonValue,
        provider: input.provider,
        model: input.model,
      },
    });
    return { id: row.id };
  }

  async complete(input: CompleteAgentRunInput): Promise<void> {
    await this.prisma.agentRun.update({
      where: { id: input.id },
      data: {
        status: input.status,
        output: input.output as Prisma.InputJsonValue | undefined,
        confidenceScore: input.confidenceScore,
        tokensUsed: input.tokensUsed,
        costUsd: input.costUsd,
        error: input.error,
        provider: input.provider,
        model: input.model,
        completedAt: new Date(),
      },
    });
  }

  async findActiveByCorrelationId(organizationId: string, correlationId: string) {
    const row = await this.prisma.agentRun.findFirst({
      where: { organizationId, correlationId, status: { in: ['PENDING', 'RUNNING'] } },
      select: { id: true, startedAt: true },
      orderBy: { startedAt: 'desc' },
    });
    return row;
  }
}
