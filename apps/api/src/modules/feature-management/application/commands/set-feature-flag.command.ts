import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  FEATURE_FLAG_REPOSITORY,
  FeatureFlagRecord,
  IFeatureFlagRepository,
} from '../../domain/repositories/feature-flag.repository.interface';
import { FeatureManagementAuditLogService } from '../../infrastructure/services/feature-management-audit-log.service';

export class SetFeatureFlagCommand {
  constructor(
    public readonly actorOrganizationId: string,
    public readonly actorId: string,
    public readonly key: string,
    public readonly isEnabled: boolean,
    public readonly description?: string,
  ) {}
}

@CommandHandler(SetFeatureFlagCommand)
export class SetFeatureFlagHandler implements ICommandHandler<SetFeatureFlagCommand, FeatureFlagRecord> {
  constructor(
    @Inject(FEATURE_FLAG_REPOSITORY) private readonly repository: IFeatureFlagRepository,
    private readonly auditLog: FeatureManagementAuditLogService,
  ) {}

  async execute(command: SetFeatureFlagCommand): Promise<FeatureFlagRecord> {
    const flag = await this.repository.upsert(command.key, {
      defaultValue: command.isEnabled,
      description: command.description,
    });

    await this.auditLog.record(
      command.actorOrganizationId,
      command.actorId,
      'feature-flag.updated',
      'FeatureFlag',
      flag.id,
      undefined,
      { key: command.key, isEnabled: command.isEnabled },
    );

    return flag;
  }
}
