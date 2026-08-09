import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateAiResponseInput,
  IAiResponseRepository,
} from '../../domain/repositories/ai-response.repository.interface';

@Injectable()
export class PrismaAiResponseRepository implements IAiResponseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAiResponseInput) {
    const row = await this.prisma.aiResponse.create({
      data: {
        agentRunId: input.agentRunId,
        promptId: input.promptId,
        modelRegistryEntryId: input.modelRegistryEntryId,
        promptVersion: input.promptVersion,
        promptHash: input.promptHash,
        rawResponse: input.rawResponse as Prisma.InputJsonValue,
        parsedResponse: input.parsedResponse as Prisma.InputJsonValue,
        confidenceScore: input.confidenceScore,
        tokensUsed: input.tokensUsed,
        inputTokens: input.inputTokens,
        outputTokens: input.outputTokens,
        latencyMs: input.latencyMs,
        costUsd: input.costUsd,
      },
    });
    return { id: row.id };
  }
}
