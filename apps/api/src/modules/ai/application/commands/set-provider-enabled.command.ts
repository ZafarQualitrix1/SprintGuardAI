import { Inject, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  AI_PROVIDER_CONFIG_REPOSITORY,
  AiProviderConfigRecord,
  IAiProviderConfigRepository,
} from '../../domain/repositories/ai-provider-config.repository.interface';
import { AiAuditLogService } from '../../infrastructure/services/ai-audit-log.service';

const SUPPORTED_PROVIDERS = new Set(['groq', 'openai', 'anthropic', 'openrouter', 'google']);

export class SetProviderEnabledCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly provider: string,
    public readonly isEnabled: boolean,
  ) {}
}

@CommandHandler(SetProviderEnabledCommand)
export class SetProviderEnabledHandler implements ICommandHandler<SetProviderEnabledCommand, AiProviderConfigRecord> {
  constructor(
    @Inject(AI_PROVIDER_CONFIG_REPOSITORY) private readonly repository: IAiProviderConfigRepository,
    private readonly auditLog: AiAuditLogService,
  ) {}

  async execute(command: SetProviderEnabledCommand): Promise<AiProviderConfigRecord> {
    if (!SUPPORTED_PROVIDERS.has(command.provider)) {
      throw new BadRequestException(
        `"${command.provider}" isn't integrated yet -- only ${Array.from(SUPPORTED_PROVIDERS).join(', ')} can be enabled.`,
      );
    }

    if (command.isEnabled) {
      const existing = await this.repository.findByOrgAndProvider(command.organizationId, command.provider);
      if (!existing?.apiKeyEncrypted) {
        throw new BadRequestException('Configure an API key for this provider before enabling it.');
      }
    }

    const config = await this.repository.setEnabled(command.organizationId, command.provider, command.isEnabled);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      command.isEnabled ? 'ai-provider.enabled' : 'ai-provider.disabled',
      'AiProviderConfig',
      config.id,
    );

    return config;
  }
}
