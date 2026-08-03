import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  FEATURE_FLAG_REPOSITORY,
  FeatureFlagRecord,
  IFeatureFlagRepository,
} from '../../domain/repositories/feature-flag.repository.interface';
import { FeatureManagementAuditLogService } from '../../infrastructure/services/feature-management-audit-log.service';

export class SetFeatureFlagOverrideCommand {
  constructor(
    public readonly actorOrganizationId: string,
    public readonly actorId: string,
    public readonly key: string,
    public readonly isEnabled: boolean,
    public readonly rolloutPercentage: number = 100,
  ) {}
}

@CommandHandler(SetFeatureFlagOverrideCommand)
export class SetFeatureFlagOverrideHandler
  implements ICommandHandler<SetFeatureFlagOverrideCommand, FeatureFlagRecord>
{
  constructor(
    @Inject(FEATURE_FLAG_REPOSITORY) private readonly repository: IFeatureFlagRepository,
    private readonly auditLog: FeatureManagementAuditLogService,
  ) {}

  async execute(command: SetFeatureFlagOverrideCommand): Promise<FeatureFlagRecord> {
    const flag = await this.repository.setOrgOverride(
      command.key,
      command.actorOrganizationId,
      command.isEnabled,
      command.rolloutPercentage,
    );

    await this.auditLog.record(
      command.actorOrganizationId,
      command.actorId,
      'feature-flag.override_set',
      'FeatureFlag',
      flag.id,
      undefined,
      { key: command.key, isEnabled: command.isEnabled, rolloutPercentage: command.rolloutPercentage },
    );

    return flag;
  }
}
