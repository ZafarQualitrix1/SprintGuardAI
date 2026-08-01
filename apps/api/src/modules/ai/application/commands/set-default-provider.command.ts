import { Inject, BadRequestException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  AI_PROVIDER_CONFIG_REPOSITORY,
  AiProviderConfigRecord,
  IAiProviderConfigRepository,
} from '../../domain/repositories/ai-provider-config.repository.interface';
import { AiAuditLogService } from '../../infrastructure/services/ai-audit-log.service';

export class SetDefaultProviderCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly provider: string,
  ) {}
}

@CommandHandler(SetDefaultProviderCommand)
export class SetDefaultProviderHandler implements ICommandHandler<SetDefaultProviderCommand, AiProviderConfigRecord> {
  constructor(
    @Inject(AI_PROVIDER_CONFIG_REPOSITORY) private readonly repository: IAiProviderConfigRepository,
    private readonly auditLog: AiAuditLogService,
  ) {}

  async execute(command: SetDefaultProviderCommand): Promise<AiProviderConfigRecord> {
    const existing = await this.repository.findByOrgAndProvider(command.organizationId, command.provider);
    if (!existing?.isEnabled) {
      throw new BadRequestException('Enable this provider before making it the default.');
    }

    const config = await this.repository.setDefault(command.organizationId, command.provider);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'ai-provider.default_changed',
      'AiProviderConfig',
      config.id,
    );

    return config;
  }
}
