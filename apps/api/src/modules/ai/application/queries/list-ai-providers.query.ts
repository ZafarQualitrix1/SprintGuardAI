import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AI_PROVIDER_CONFIG_REPOSITORY,
  IAiProviderConfigRepository,
} from '../../domain/repositories/ai-provider-config.repository.interface';
import {
  AI_PROVIDER_STATS_REPOSITORY,
  IAiProviderStatsRepository,
} from '../../domain/repositories/ai-provider-stats.repository.interface';

export interface AiProviderSummary {
  provider: string;
  displayName: string;
  // SDK actually integrated (google/openai/anthropic) vs a catalog placeholder with no working
  // connector yet -- rendered as a disabled "not yet integrated" tile in AI Settings.
  supported: boolean;
  isEnabled: boolean;
  isDefault: boolean;
  hasApiKey: boolean;
  defaultModel: string | null;
  healthStatus: string;
  lastConnectedAt: string | null;
  lastTestLatencyMs: number | null;
  lastTestError: string | null;
  totalRequests: number;
  successRate: number;
  avgResponseTimeMs: number | null;
}

const KNOWN_PROVIDERS: Array<{ provider: string; displayName: string; supported: boolean }> = [
  { provider: 'groq', displayName: 'Groq', supported: true },
  { provider: 'openai', displayName: 'OpenAI', supported: true },
  { provider: 'anthropic', displayName: 'Claude (Anthropic)', supported: true },
  { provider: 'deepseek', displayName: 'DeepSeek', supported: false },
  { provider: 'ollama', displayName: 'Ollama', supported: false },
  { provider: 'openrouter', displayName: 'OpenRouter', supported: true },
];

export class ListAiProvidersQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(ListAiProvidersQuery)
export class ListAiProvidersHandler implements IQueryHandler<ListAiProvidersQuery, AiProviderSummary[]> {
  constructor(
    @Inject(AI_PROVIDER_CONFIG_REPOSITORY) private readonly configRepository: IAiProviderConfigRepository,
    @Inject(AI_PROVIDER_STATS_REPOSITORY) private readonly statsRepository: IAiProviderStatsRepository,
  ) {}

  async execute(query: ListAiProvidersQuery): Promise<AiProviderSummary[]> {
    const [configs, stats] = await Promise.all([
      this.configRepository.listByOrg(query.organizationId),
      this.statsRepository.listByOrg(query.organizationId),
    ]);

    const configByProvider = new Map(configs.map((c) => [c.provider, c]));
    const statsByProvider = new Map(stats.map((s) => [s.provider, s]));

    return KNOWN_PROVIDERS.map(({ provider, displayName, supported }) => {
      const config = configByProvider.get(provider);
      const providerStats = statsByProvider.get(provider);

      return {
        provider,
        displayName,
        supported,
        isEnabled: config?.isEnabled ?? false,
        isDefault: config?.isDefault ?? false,
        hasApiKey: Boolean(config?.apiKeyEncrypted),
        defaultModel: config?.defaultModel ?? null,
        healthStatus: config?.healthStatus ?? 'UNKNOWN',
        lastConnectedAt: config?.lastConnectedAt?.toISOString() ?? null,
        lastTestLatencyMs: config?.lastTestLatencyMs ?? null,
        lastTestError: config?.lastTestError ?? null,
        totalRequests: providerStats?.totalRequests ?? 0,
        successRate: providerStats?.successRate ?? 0,
        avgResponseTimeMs: providerStats?.avgResponseTimeMs ?? null,
      };
    });
  }
}
