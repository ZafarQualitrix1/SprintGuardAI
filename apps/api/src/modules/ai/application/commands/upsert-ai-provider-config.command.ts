import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  AI_PROVIDER_CONFIG_REPOSITORY,
  AiProviderConfigRecord,
  IAiProviderConfigRepository,
} from '../../domain/repositories/ai-provider-config.repository.interface';
import { AiAuditLogService } from '../../infrastructure/services/ai-audit-log.service';

export interface UpsertAiProviderConfigInput {
  apiKey?: string; // blank/omitted = keep the currently-stored key (same convention as Jira credentials)
  defaultModel?: string | null;
  projectId?: string | null;
  region?: string | null;
  timeoutMs?: number | null;
  retryCount?: number | null;
  temperature?: number | null;
  topP?: number | null;
  topK?: number | null;
  maxOutputTokens?: number | null;
  streaming?: boolean;
  safetySettings?: unknown;
  fallbackProvider?: string | null;
  fallbackModel?: string | null;
}

export class UpsertAiProviderConfigCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly provider: string,
    public readonly input: UpsertAiProviderConfigInput,
  ) {}
}

@CommandHandler(UpsertAiProviderConfigCommand)
export class UpsertAiProviderConfigHandler
  implements ICommandHandler<UpsertAiProviderConfigCommand, AiProviderConfigRecord>
{
  constructor(
    @Inject(AI_PROVIDER_CONFIG_REPOSITORY) private readonly repository: IAiProviderConfigRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    private readonly auditLog: AiAuditLogService,
  ) {}

  async execute(command: UpsertAiProviderConfigCommand): Promise<AiProviderConfigRecord> {
    const { apiKey, ...rest } = command.input;
    // A blank form field arrives here as '', not null/undefined -- and every consumer of these
    // columns (test-ai-provider-connection.command.ts, ai-provider-config.service.ts) falls back
    // to a sensible default via `?? `, which only triggers on null/undefined. Left as '', it
    // silently wins over the fallback and gets sent to the provider as e.g. `model: ''`.
    const STRING_FIELDS = ['defaultModel', 'projectId', 'region', 'fallbackProvider', 'fallbackModel'] as const;
    for (const field of STRING_FIELDS) {
      if (rest[field] === '') {
        rest[field] = null;
      }
    }

    const config = await this.repository.upsert({
      organizationId: command.organizationId,
      provider: command.provider,
      ...(apiKey ? { apiKeyEncrypted: this.credentialVault.encrypt(apiKey) } : {}),
      ...rest,
    });

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'ai-provider.config_updated',
      'AiProviderConfig',
      config.id,
      undefined,
      { provider: command.provider, defaultModel: config.defaultModel, credentialRotated: Boolean(apiKey) },
    );

    return config;
  }
}
