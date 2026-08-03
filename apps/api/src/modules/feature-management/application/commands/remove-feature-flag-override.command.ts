import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  FEATURE_FLAG_REPOSITORY,
  FeatureFlagRecord,
  IFeatureFlagRepository,
} from '../../domain/repositories/feature-flag.repository.interface';
import { FeatureManagementAuditLogService } from '../../infrastructure/services/feature-management-audit-log.service';

export class RemoveFeatureFlagOverrideCommand {
  constructor(
    public readonly actorOrganizationId: string,
    public readonly actorId: string,
    public readonly key: string,
  ) {}
}

@CommandHandler(RemoveFeatureFlagOverrideCommand)
export class RemoveFeatureFlagOverrideHandler
  implements ICommandHandler<RemoveFeatureFlagOverrideCommand, FeatureFlagRecord>
{
  constructor(
    @Inject(FEATURE_FLAG_REPOSITORY) private readonly repository: IFeatureFlagRepository,
    private readonly auditLog: FeatureManagementAuditLogService,
  ) {}

  async execute(command: RemoveFeatureFlagOverrideCommand): Promise<FeatureFlagRecord> {
    const flag = await this.repository.removeOrgOverride(command.key, command.actorOrganizationId);

    await this.auditLog.record(
      command.actorOrganizationId,
      command.actorId,
      'feature-flag.override_removed',
      'FeatureFlag',
      flag.id,
    );

    return flag;
  }
}
