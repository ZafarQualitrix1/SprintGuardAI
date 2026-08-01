import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  AI_PROVIDER_CONFIG_REPOSITORY,
  IAiProviderConfigRepository,
} from '../../domain/repositories/ai-provider-config.repository.interface';
import {
  IModuleAiConfigRepository,
  MODULE_AI_CONFIG_REPOSITORY,
} from '../../domain/repositories/module-ai-config.repository.interface';

export interface ResolvedAiConfig {
  provider: string;
  // Explicit override from ModuleAiConfig/ModelRegistry lookup; undefined means the caller should
  // fall back to ModelRegistryEntry.findActiveForCapability as before this feature existed.
  model?: string;
  apiKey?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  retryCount?: number;
  timeoutMs?: number;
  fallbackProvider?: string;
  fallbackModel?: string;
}

// Resolves DB-configured provider credentials/parameters and per-module overrides into the
// values AiOrchestrationService actually needs for a single execute() call. Centralizing this
// here (rather than inline in the orchestration service) keeps the "where does this org's Groq
// key/temperature/fallback come from" question answerable in one place -- also used directly by
// the AI Settings test-connection command.
@Injectable()
export class AiProviderConfigService {
  constructor(
    @Inject(AI_PROVIDER_CONFIG_REPOSITORY) private readonly providerConfigRepository: IAiProviderConfigRepository,
    @Inject(MODULE_AI_CONFIG_REPOSITORY) private readonly moduleConfigRepository: IModuleAiConfigRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    private readonly configService: ConfigService,
  ) {}

  async resolveApiKey(organizationId: string, provider: string): Promise<string | undefined> {
    const config = await this.providerConfigRepository.findByOrgAndProvider(organizationId, provider);
    return config?.apiKeyEncrypted ? this.credentialVault.decrypt(config.apiKeyEncrypted) : undefined;
  }

  private async resolveDefaultProvider(organizationId: string): Promise<string | undefined> {
    const configs = await this.providerConfigRepository.listByOrg(organizationId);
    return configs.find((c) => c.isDefault && c.isEnabled)?.provider;
  }

  async resolveEffectiveConfig(
    organizationId: string,
    capability: string,
    explicitProvider?: string,
  ): Promise<ResolvedAiConfig> {
    const moduleConfig = await this.moduleConfigRepository.findByOrgAndCapability(organizationId, capability);
    const useModule = Boolean(moduleConfig?.isEnabled);

    const provider =
      explicitProvider ??
      (useModule ? moduleConfig?.provider ?? undefined : undefined) ??
      (await this.resolveDefaultProvider(organizationId)) ??
      this.configService.get<string>('ai.defaultProvider')!;

    const providerConfig = await this.providerConfigRepository.findByOrgAndProvider(organizationId, provider);
    const apiKey = providerConfig?.apiKeyEncrypted ? this.credentialVault.decrypt(providerConfig.apiKeyEncrypted) : undefined;

    return {
      provider,
      model: (useModule ? moduleConfig?.model ?? undefined : undefined) ?? providerConfig?.defaultModel ?? undefined,
      apiKey,
      temperature:
        (useModule ? moduleConfig?.temperature ?? undefined : undefined) ?? providerConfig?.temperature ?? undefined,
      topP: providerConfig?.topP ?? undefined,
      topK: providerConfig?.topK ?? undefined,
      maxTokens:
        (useModule ? moduleConfig?.maxTokens ?? undefined : undefined) ?? providerConfig?.maxOutputTokens ?? undefined,
      retryCount:
        (useModule ? moduleConfig?.retryCount ?? undefined : undefined) ?? providerConfig?.retryCount ?? undefined,
      timeoutMs:
        (useModule ? moduleConfig?.timeoutMs ?? undefined : undefined) ?? providerConfig?.timeoutMs ?? undefined,
      fallbackProvider:
        (useModule ? moduleConfig?.fallbackProvider ?? undefined : undefined) ??
        providerConfig?.fallbackProvider ??
        undefined,
      fallbackModel:
        (useModule ? moduleConfig?.fallbackModel ?? undefined : undefined) ?? providerConfig?.fallbackModel ?? undefined,
    };
  }
}
