import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AI_PROVIDERS, IAiProvider } from '../ports/ai-provider.port';
import {
  AI_PROVIDER_CONFIG_REPOSITORY,
  IAiProviderConfigRepository,
} from '../../domain/repositories/ai-provider-config.repository.interface';
import { AiProviderConfigService } from '../services/ai-provider-config.service';

export interface TestAiProviderConnectionResult {
  healthStatus: 'HEALTHY' | 'UNHEALTHY';
  latencyMs: number;
  model: string;
  error?: string;
}

const TEST_PROMPT = 'Reply with exactly one word: OK';

// Diagnostic action, not a must-succeed one -- returns a result rather than throwing, same
// convention as the Integration Hub's TestConnectionCommand.
export class TestAiProviderConnectionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly provider: string,
  ) {}
}

@CommandHandler(TestAiProviderConnectionCommand)
export class TestAiProviderConnectionHandler
  implements ICommandHandler<TestAiProviderConnectionCommand, TestAiProviderConnectionResult>
{
  private readonly logger = new Logger(TestAiProviderConnectionHandler.name);

  constructor(
    @Inject(AI_PROVIDERS) private readonly providers: IAiProvider[],
    @Inject(AI_PROVIDER_CONFIG_REPOSITORY) private readonly repository: IAiProviderConfigRepository,
    private readonly aiProviderConfigService: AiProviderConfigService,
  ) {}

  async execute(command: TestAiProviderConnectionCommand): Promise<TestAiProviderConnectionResult> {
    const config = await this.repository.findByOrgAndProvider(command.organizationId, command.provider);
    if (!config) {
      throw new NotFoundException(`No AI provider config for "${command.provider}" in this organization`);
    }

    const providerImpl = this.providers.find((p) => p.key === command.provider);
    if (!providerImpl) {
      throw new NotFoundException(`No connector registered for provider "${command.provider}"`);
    }

    const apiKey = await this.aiProviderConfigService.resolveApiKey(command.organizationId, command.provider);
    const model = config.defaultModel ?? this.defaultModelFor(command.provider);
    const startedAt = Date.now();

    try {
      await providerImpl.complete({ systemPrompt: 'You are a connectivity health check.', prompt: TEST_PROMPT, apiKey }, model);
      const latencyMs = Date.now() - startedAt;
      await this.repository.updateHealth(command.organizationId, command.provider, {
        healthStatus: 'HEALTHY',
        lastConnectedAt: new Date(),
        lastTestLatencyMs: latencyMs,
        lastTestError: null,
      });
      return { healthStatus: 'HEALTHY', latencyMs, model };
    } catch (error) {
      const latencyMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : 'Connection test failed';
      this.logger.warn(`AI provider test failed for "${command.provider}": ${message}`);
      await this.repository.updateHealth(command.organizationId, command.provider, {
        healthStatus: 'UNHEALTHY',
        lastTestLatencyMs: latencyMs,
        lastTestError: message,
      });
      return { healthStatus: 'UNHEALTHY', latencyMs, model, error: message };
    }
  }

  private defaultModelFor(provider: string): string {
    switch (provider) {
      case 'groq':
        return 'llama-3.3-70b-versatile';
      case 'openai':
        return 'gpt-4o-mini';
      case 'anthropic':
        return 'claude-sonnet-5';
      case 'openrouter':
        return 'openai/gpt-4o-mini';
      case 'google':
        return 'gemini-2.0-flash';
      default:
        return 'default';
    }
  }
}
