import { randomUUID } from 'crypto';
import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { z } from 'zod';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';
import { AGENT_REPOSITORY, IAgentRepository } from '../../../ai/domain/repositories';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';

// Any valid JSON object -- playground can test prompts with no predefined Zod schema of their
// own (a brand-new draft), so this is the most permissive validator that still exercises the
// real extractJson/repair-retry pipeline exactly like production capabilities do.
const permissiveOutputSchema = z.record(z.string(), z.unknown());

export interface PromptPlaygroundResult {
  success: boolean;
  rawText?: string;
  parsedOutput?: unknown;
  confidenceScore?: number;
  tokensUsed?: number;
  costUsd?: number;
  latencyMs?: number;
  agentRunId?: string;
  errorMessage?: string;
}

export class RunPromptPlaygroundCommand {
  constructor(
    public readonly organizationId: string,
    public readonly promptId: string,
    public readonly variables: Record<string, unknown>,
    public readonly providerOverride?: string,
  ) {}
}

@CommandHandler(RunPromptPlaygroundCommand)
export class RunPromptPlaygroundHandler implements ICommandHandler<RunPromptPlaygroundCommand, PromptPlaygroundResult> {
  constructor(
    @Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository,
    @Inject(AGENT_REPOSITORY) private readonly agentRepository: IAgentRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(command: RunPromptPlaygroundCommand): Promise<PromptPlaygroundResult> {
    const prompt = await this.promptRepository.findById(command.promptId);
    if (!prompt) {
      throw new NotFoundException('Prompt not found');
    }
    const agent = await this.agentRepository.findByCapability(prompt.capability);
    if (!agent) {
      throw new BadRequestException(
        `No AI Agent has capability "${prompt.capability}" -- assign this capability to an agent before testing.`,
      );
    }

    const startedAt = Date.now();
    try {
      const result = await this.aiOrchestrationService.execute({
        capability: prompt.capability,
        agentKey: agent.key,
        organizationId: command.organizationId,
        variables: command.variables,
        outputSchema: permissiveOutputSchema,
        provider: command.providerOverride,
        correlationId: `playground-${randomUUID()}`,
        promptOverride: prompt.id,
      });

      return {
        success: true,
        parsedOutput: result.data,
        confidenceScore: result.confidenceScore,
        agentRunId: result.agentRunId,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        success: false,
        errorMessage: error instanceof Error ? error.message : String(error),
        latencyMs: Date.now() - startedAt,
      };
    }
  }
}
