import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  IModuleAiConfigRepository,
  MODULE_AI_CONFIG_REPOSITORY,
  ModuleAiConfigRecord,
} from '../../domain/repositories/module-ai-config.repository.interface';
import { AiAuditLogService } from '../../infrastructure/services/ai-audit-log.service';

export interface UpsertModuleAiConfigInput {
  isEnabled?: boolean;
  provider?: string | null;
  model?: string | null;
  temperature?: number | null;
  maxTokens?: number | null;
  retryCount?: number | null;
  timeoutMs?: number | null;
  streaming?: boolean | null;
  fallbackProvider?: string | null;
  fallbackModel?: string | null;
}

export class UpsertModuleAiConfigCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly capability: string,
    public readonly input: UpsertModuleAiConfigInput,
  ) {}
}

@CommandHandler(UpsertModuleAiConfigCommand)
export class UpsertModuleAiConfigHandler implements ICommandHandler<UpsertModuleAiConfigCommand, ModuleAiConfigRecord> {
  constructor(
    @Inject(MODULE_AI_CONFIG_REPOSITORY) private readonly repository: IModuleAiConfigRepository,
    private readonly auditLog: AiAuditLogService,
  ) {}

  async execute(command: UpsertModuleAiConfigCommand): Promise<ModuleAiConfigRecord> {
    const config = await this.repository.upsert({
      organizationId: command.organizationId,
      capability: command.capability,
      ...command.input,
    });

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'ai-module-config.updated',
      'ModuleAiConfig',
      config.id,
      undefined,
      { capability: command.capability, provider: config.provider, model: config.model },
    );

    return config;
  }
}
