import { z } from 'zod';
import { IAiProvider } from '../ports/ai-provider.port';
import { IAgentRepository } from '../../domain/repositories/agent.repository.interface';
import { IAgentRunRepository } from '../../domain/repositories/agent-run.repository.interface';
import { IAiPromptRepository } from '../../domain/repositories/ai-prompt.repository.interface';
import { IAiResponseRepository } from '../../domain/repositories/ai-response.repository.interface';
import { IModelRegistryRepository } from '../../domain/repositories/model-registry.repository.interface';
import { AiOrchestrationService } from './ai-orchestration.service';
import { AiProviderConfigService } from './ai-provider-config.service';

const outputSchema = z.object({ items: z.array(z.string()).min(1) });

function buildService(provider: IAiProvider, resolvedConfigOverrides: Record<string, unknown> = {}) {
  const agentRunRepository: jest.Mocked<IAgentRunRepository> = {
    start: jest.fn().mockResolvedValue({ id: 'run-1' }),
    complete: jest.fn().mockResolvedValue(undefined),
  };
  const responseRepository: jest.Mocked<IAiResponseRepository> = {
    create: jest.fn().mockResolvedValue({ id: 'response-1' }),
  };
  const promptRepository: jest.Mocked<IAiPromptRepository> = {
    findActiveByCapability: jest.fn().mockResolvedValue({
      id: 'prompt-1',
      capability: 'test-capability',
      version: 'v1',
      template: 'Say hello to {{name}}',
      templateHash: 'hash-1',
    }),
    findById: jest.fn().mockResolvedValue(null),
  };
  const agentRepository: jest.Mocked<IAgentRepository> = {
    findByKey: jest.fn().mockResolvedValue({ id: 'agent-1', key: 'test-agent' }),
    findByCapability: jest.fn().mockResolvedValue(null),
    appendCapability: jest.fn().mockResolvedValue(undefined),
  };
  const modelRegistryRepository: jest.Mocked<IModelRegistryRepository> = {
    findActiveForCapability: jest.fn().mockResolvedValue({ id: 'model-1', provider: 'groq', model: 'llama-3.3-70b-versatile' }),
    listAll: jest.fn().mockResolvedValue([]),
  };
  const aiProviderConfigService = {
    resolveEffectiveConfig: jest.fn().mockResolvedValue({ provider: 'groq', ...resolvedConfigOverrides }),
    resolveApiKey: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<AiProviderConfigService>;

  const service = new AiOrchestrationService(
    [provider],
    agentRepository,
    agentRunRepository,
    promptRepository,
    responseRepository,
    modelRegistryRepository,
    aiProviderConfigService,
  );

  return { service, agentRunRepository, responseRepository, aiProviderConfigService, modelRegistryRepository };
}

describe('AiOrchestrationService', () => {
  it('returns parsed data and full confidence on the first valid attempt', async () => {
    const provider: jest.Mocked<IAiProvider> = {
      key: 'groq',
      complete: jest.fn().mockResolvedValue({ text: '{"items":["a","b"]}', inputTokens: 10, outputTokens: 5 }),
    };
    const { service, agentRunRepository, responseRepository } = buildService(provider);

    const result = await service.execute({
      capability: 'test-capability',
      agentKey: 'test-agent',
      organizationId: 'org-1',
      variables: { name: 'World' },
      outputSchema,
    });

    expect(result.data).toEqual({ items: ['a', 'b'] });
    expect(result.confidenceScore).toBe(1);
    expect(result.provider).toBe('groq');
    expect(result.model).toBe('llama-3.3-70b-versatile');
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(agentRunRepository.complete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'run-1', status: 'SUCCEEDED', confidenceScore: 1 }),
    );
    expect(responseRepository.create).toHaveBeenCalledTimes(1);
  });

  it('repairs once on invalid JSON and returns a discounted confidence score', async () => {
    const provider: jest.Mocked<IAiProvider> = {
      key: 'groq',
      complete: jest
        .fn()
        .mockResolvedValueOnce({ text: 'not valid json at all', inputTokens: 10, outputTokens: 5 })
        .mockResolvedValueOnce({ text: '{"items":["a"]}', inputTokens: 10, outputTokens: 5 }),
    };
    const { service } = buildService(provider);

    const result = await service.execute({
      capability: 'test-capability',
      agentKey: 'test-agent',
      organizationId: 'org-1',
      variables: { name: 'World' },
      outputSchema,
    });

    expect(result.data).toEqual({ items: ['a'] });
    expect(result.confidenceScore).toBeCloseTo(0.7);
    expect(provider.complete).toHaveBeenCalledTimes(2);
    // The repair prompt includes the prior error so the model can self-correct.
    expect(provider.complete.mock.calls[1][0].prompt).toContain('Your previous response was invalid');
  });

  it('flags the run for review and throws after exhausting retries when no fallback is configured', async () => {
    const provider: jest.Mocked<IAiProvider> = {
      key: 'groq',
      complete: jest.fn().mockResolvedValue({ text: 'still not json', inputTokens: 1, outputTokens: 1 }),
    };
    const { service, agentRunRepository } = buildService(provider);

    await expect(
      service.execute({
        capability: 'test-capability',
        agentKey: 'test-agent',
        organizationId: 'org-1',
        variables: {},
        outputSchema,
      }),
    ).rejects.toThrow(/failed validation after retry/);

    expect(agentRunRepository.complete).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'FLAGGED_FOR_REVIEW' }),
    );
  });

  it('clamps an oversized configured maxTokens down to the capability ceiling before calling the provider', async () => {
    const provider: jest.Mocked<IAiProvider> = {
      key: 'groq',
      complete: jest.fn().mockResolvedValue({ text: '{"items":["a"]}', inputTokens: 10, outputTokens: 5 }),
    };
    // A single org-wide maxOutputTokens (e.g. raised for full-file automation generation) must not
    // reach an unrelated lightweight capability like this one at its full, unclamped value -- on
    // tiers with a hard per-minute token ceiling below that, an oversized single request is
    // rejected outright regardless of how small the actual prompt is.
    const { service } = buildService(provider, { maxTokens: 20000 });

    await service.execute({
      capability: 'test-capability',
      agentKey: 'test-agent',
      organizationId: 'org-1',
      variables: { name: 'World' },
      outputSchema,
    });

    expect(provider.complete.mock.calls[0][0].maxTokens).toBe(4096);
  });

  it('gives large-output capabilities (e.g. automation generation) a higher clamp ceiling', async () => {
    const provider: jest.Mocked<IAiProvider> = {
      key: 'groq',
      complete: jest.fn().mockResolvedValue({ text: '{"items":["a"]}', inputTokens: 10, outputTokens: 5 }),
    };
    const { service } = buildService(provider, { maxTokens: 20000 });

    await service.execute({
      capability: 'playwright-api-automation',
      agentKey: 'test-agent',
      organizationId: 'org-1',
      variables: { name: 'World' },
      outputSchema,
    });

    expect(provider.complete.mock.calls[0][0].maxTokens).toBe(8000);
  });

  it('retries once against the configured fallback provider when the primary exhausts its retries', async () => {
    const primaryProvider: jest.Mocked<IAiProvider> = {
      key: 'groq',
      complete: jest.fn().mockResolvedValue({ text: 'still not json', inputTokens: 1, outputTokens: 1 }),
    };
    const fallbackProvider: jest.Mocked<IAiProvider> = {
      key: 'anthropic',
      complete: jest.fn().mockResolvedValue({ text: '{"items":["fallback-worked"]}', inputTokens: 4, outputTokens: 2 }),
    };

    const agentRunRepository: jest.Mocked<IAgentRunRepository> = {
      start: jest.fn().mockResolvedValue({ id: 'run-1' }),
      complete: jest.fn().mockResolvedValue(undefined),
    };
    const responseRepository: jest.Mocked<IAiResponseRepository> = {
      create: jest.fn().mockResolvedValue({ id: 'response-1' }),
    };
    const promptRepository: jest.Mocked<IAiPromptRepository> = {
      findActiveByCapability: jest.fn().mockResolvedValue({
        id: 'prompt-1',
        capability: 'test-capability',
        version: 'v1',
        template: 'Say hello to {{name}}',
        templateHash: 'hash-1',
      }),
      findById: jest.fn().mockResolvedValue(null),
    };
    const agentRepository: jest.Mocked<IAgentRepository> = {
      findByKey: jest.fn().mockResolvedValue({ id: 'agent-1', key: 'test-agent' }),
      findByCapability: jest.fn().mockResolvedValue(null),
      appendCapability: jest.fn().mockResolvedValue(undefined),
    };
    const modelRegistryRepository: jest.Mocked<IModelRegistryRepository> = {
      findActiveForCapability: jest.fn().mockResolvedValue({ id: 'model-1', provider: 'groq', model: 'llama-3.3-70b-versatile' }),
      listAll: jest.fn().mockResolvedValue([]),
    };
    const aiProviderConfigService = {
      resolveEffectiveConfig: jest.fn().mockResolvedValue({
        provider: 'groq',
        retryCount: 1,
        fallbackProvider: 'anthropic',
        fallbackModel: 'claude-sonnet-5',
      }),
      resolveApiKey: jest.fn().mockResolvedValue('fallback-key'),
    } as unknown as jest.Mocked<AiProviderConfigService>;

    const service = new AiOrchestrationService(
      [primaryProvider, fallbackProvider],
      agentRepository,
      agentRunRepository,
      promptRepository,
      responseRepository,
      modelRegistryRepository,
      aiProviderConfigService,
    );

    const result = await service.execute({
      capability: 'test-capability',
      agentKey: 'test-agent',
      organizationId: 'org-1',
      variables: {},
      outputSchema,
    });

    expect(result.data).toEqual({ items: ['fallback-worked'] });
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-5');
    expect(primaryProvider.complete).toHaveBeenCalledTimes(1);
    expect(fallbackProvider.complete).toHaveBeenCalledTimes(1);
    expect(agentRunRepository.complete).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'SUCCEEDED', provider: 'anthropic', model: 'claude-sonnet-5' }),
    );
  });
});
