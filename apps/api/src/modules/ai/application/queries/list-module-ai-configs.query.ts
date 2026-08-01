import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AI_PROMPT_REPOSITORY,
  IAiPromptRepository,
} from '../../domain/repositories/ai-prompt.repository.interface';
import {
  IModuleAiConfigRepository,
  MODULE_AI_CONFIG_REPOSITORY,
} from '../../domain/repositories/module-ai-config.repository.interface';

export interface ModuleAiConfigSummary {
  capability: string;
  displayName: string;
  // False for modules the spec names but that have no wired AiOrchestrationService.execute() call
  // yet (Bug Analysis, Analytics, Executive Summary, Prompt Optimization) -- shown as informational
  // "not yet integrated" rows rather than a working config, since there's no capability/agent for
  // them to actually configure.
  integrated: boolean;
  isEnabled: boolean;
  provider: string | null;
  model: string | null;
  temperature: number | null;
  maxTokens: number | null;
  retryCount: number | null;
  timeoutMs: number | null;
  streaming: boolean | null;
  fallbackProvider: string | null;
  fallbackModel: string | null;
  activePromptVersion: string | null;
}

const KNOWN_MODULES: Array<{ capability: string; displayName: string; integrated: boolean }> = [
  { capability: 'requirement-intelligence', displayName: 'Requirement Intelligence', integrated: true },
  { capability: 'deep-requirement-analysis', displayName: 'Deep Requirement Analysis', integrated: true },
  { capability: 'test-scenario', displayName: 'Test Generator (Scenarios)', integrated: true },
  { capability: 'test-case', displayName: 'Test Generator (Cases)', integrated: true },
  { capability: 'coverage-recommendation', displayName: 'Test Coverage', integrated: true },
  { capability: 'release-readiness-summary', displayName: 'Release Readiness', integrated: true },
  { capability: 'bug-analysis', displayName: 'Bug Analysis', integrated: false },
  { capability: 'analytics-summary', displayName: 'Analytics', integrated: false },
  { capability: 'executive-summary', displayName: 'Executive Summary', integrated: false },
  { capability: 'prompt-optimization', displayName: 'Prompt Optimization', integrated: false },
];

export class ListModuleAiConfigsQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ListModuleAiConfigsQuery)
export class ListModuleAiConfigsHandler implements IQueryHandler<ListModuleAiConfigsQuery, ModuleAiConfigSummary[]> {
  constructor(
    @Inject(MODULE_AI_CONFIG_REPOSITORY) private readonly moduleConfigRepository: IModuleAiConfigRepository,
    @Inject(AI_PROMPT_REPOSITORY) private readonly promptRepository: IAiPromptRepository,
  ) {}

  async execute(query: ListModuleAiConfigsQuery): Promise<ModuleAiConfigSummary[]> {
    const configs = await this.moduleConfigRepository.listByOrg(query.organizationId);
    const configByCapability = new Map(configs.map((c) => [c.capability, c]));

    return Promise.all(
      KNOWN_MODULES.map(async ({ capability, displayName, integrated }) => {
        const config = configByCapability.get(capability);
        const activePrompt = integrated ? await this.promptRepository.findActiveByCapability(capability) : null;

        return {
          capability,
          displayName,
          integrated,
          isEnabled: config?.isEnabled ?? true,
          provider: config?.provider ?? null,
          model: config?.model ?? null,
          temperature: config?.temperature ?? null,
          maxTokens: config?.maxTokens ?? null,
          retryCount: config?.retryCount ?? null,
          timeoutMs: config?.timeoutMs ?? null,
          streaming: config?.streaming ?? null,
          fallbackProvider: config?.fallbackProvider ?? null,
          fallbackModel: config?.fallbackModel ?? null,
          activePromptVersion: activePrompt?.version ?? null,
        };
      }),
    );
  }
}
