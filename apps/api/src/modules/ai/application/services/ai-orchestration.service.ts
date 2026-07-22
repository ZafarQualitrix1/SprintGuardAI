import { randomUUID } from 'crypto';
import { Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodType } from 'zod';
import { AI_PROVIDERS, IAiProvider } from '../ports/ai-provider.port';
import {
  AGENT_REPOSITORY,
  IAgentRepository,
  AGENT_RUN_REPOSITORY,
  IAgentRunRepository,
  AI_PROMPT_REPOSITORY,
  IAiPromptRepository,
  AI_RESPONSE_REPOSITORY,
  IAiResponseRepository,
  MODEL_REGISTRY_REPOSITORY,
  IModelRegistryRepository,
} from '../../domain/repositories';
import { renderTemplate } from '../utils/prompt-template.util';
import { extractJson } from '../utils/json-extractor.util';
import { computeConfidence } from '../utils/confidence.util';

const SYSTEM_PROMPT =
  'You are an AI agent inside SprintGuard AI, an enterprise QA intelligence platform. ' +
  'Always respond with a single valid JSON object and nothing else -- no markdown code fences, ' +
  'no commentary before or after the JSON.';

const MAX_ATTEMPTS = 2; // initial attempt + one repair retry (Solution Architecture §10.3)

export interface ExecuteAgentParams<T> {
  capability: string;
  agentKey: string;
  organizationId: string;
  variables: Record<string, unknown>;
  outputSchema: ZodType<T>;
  correlationId?: string;
  provider?: string;
}

export interface ExecuteAgentResult<T> {
  data: T;
  confidenceScore: number;
  agentRunId: string;
}

// Application-layer service (Solution Architecture §16.1) -- the only thing any agent-executing
// module (requirement-intelligence, test-intelligence, ...) depends on. Encapsulates provider
// selection, prompt rendering, schema validation + repair retry, confidence scoring, and
// AgentRun/AiResponse persistence so no consumer module touches an LLM SDK or Prisma directly.
@Injectable()
export class AiOrchestrationService {
  constructor(
    @Inject(AI_PROVIDERS) private readonly providers: IAiProvider[],
    @Inject(AGENT_REPOSITORY) private readonly agentRepository: IAgentRepository,
    @Inject(AGENT_RUN_REPOSITORY) private readonly agentRunRepository: IAgentRunRepository,
    @Inject(AI_PROMPT_REPOSITORY) private readonly promptRepository: IAiPromptRepository,
    @Inject(AI_RESPONSE_REPOSITORY) private readonly responseRepository: IAiResponseRepository,
    @Inject(MODEL_REGISTRY_REPOSITORY) private readonly modelRegistryRepository: IModelRegistryRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute<T>(params: ExecuteAgentParams<T>): Promise<ExecuteAgentResult<T>> {
    const provider = params.provider ?? this.configService.get<string>('ai.defaultProvider')!;
    const correlationId = params.correlationId ?? randomUUID();

    const [prompt, agent, modelEntry] = await Promise.all([
      this.promptRepository.findActiveByCapability(params.capability),
      this.agentRepository.findByKey(params.agentKey),
      this.modelRegistryRepository.findActiveForCapability(provider, params.capability),
    ]);

    if (!prompt) {
      throw new NotFoundException(`No active prompt for capability "${params.capability}"`);
    }
    if (!agent) {
      throw new NotFoundException(`Unknown agent "${params.agentKey}". Run \`pnpm db:seed\`.`);
    }
    if (!modelEntry) {
      throw new NotFoundException(
        `No active model registered for provider "${provider}" and capability "${params.capability}"`,
      );
    }

    const providerImpl = this.providers.find((p) => p.key === provider);
    if (!providerImpl) {
      throw new NotFoundException(`No connector registered for provider "${provider}"`);
    }

    const agentRun = await this.agentRunRepository.start({
      agentId: agent.id,
      organizationId: params.organizationId,
      correlationId,
      input: params.variables,
      provider,
      model: modelEntry.model,
    });

    const renderedPrompt = renderTemplate(prompt.template, params.variables);
    let lastError = '';

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const userPrompt =
        attempt === 0
          ? renderedPrompt
          : `${renderedPrompt}\n\nYour previous response was invalid: ${lastError}\nReturn ONLY corrected, valid JSON.`;

      const startedAt = Date.now();
      let rawText = '';
      let tokensUsed = 0;

      try {
        const completion = await providerImpl.complete(
          { systemPrompt: SYSTEM_PROMPT, prompt: userPrompt },
          modelEntry.model,
        );
        rawText = completion.text;
        tokensUsed = completion.inputTokens + completion.outputTokens;

        const json = extractJson(rawText);
        const parsed = params.outputSchema.safeParse(json);

        if (parsed.success) {
          const confidenceScore = computeConfidence(attempt);
          const latencyMs = Date.now() - startedAt;

          await this.responseRepository.create({
            agentRunId: agentRun.id,
            promptId: prompt.id,
            modelRegistryEntryId: modelEntry.id,
            promptVersion: prompt.version,
            promptHash: prompt.templateHash,
            rawResponse: { text: rawText },
            parsedResponse: json as object,
            confidenceScore,
            tokensUsed,
            latencyMs,
          });
          await this.agentRunRepository.complete({
            id: agentRun.id,
            status: 'SUCCEEDED',
            output: json as object,
            confidenceScore,
            tokensUsed,
          });

          return { data: parsed.data, confidenceScore, agentRunId: agentRun.id };
        }

        lastError = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
    }

    await this.agentRunRepository.complete({
      id: agentRun.id,
      status: 'FLAGGED_FOR_REVIEW',
      error: lastError,
    });
    throw new UnprocessableEntityException(
      `AI agent "${params.agentKey}" output failed validation after retry: ${lastError}`,
    );
  }
}
