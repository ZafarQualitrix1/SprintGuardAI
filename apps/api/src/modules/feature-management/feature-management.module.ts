import { Module } from '@nestjs/common';
import { FeatureManagementController } from './presentation/feature-management.controller';
import { FEATURE_MANAGEMENT_COMMAND_HANDLERS } from './application/commands';
import { FEATURE_MANAGEMENT_QUERY_HANDLERS } from './application/queries';
import { FEATURE_FLAG_REPOSITORY } from './domain/repositories/feature-flag.repository.interface';
import { PrismaFeatureFlagRepository } from './infrastructure/repositories/prisma-feature-flag.repository';
import { FeatureManagementAuditLogService } from './infrastructure/services/feature-management-audit-log.service';

// Bounded context module: FeatureManagement (Admin Console "Feature Flags" tab).
@Module({
  controllers: [FeatureManagementController],
  providers: [
    ...FEATURE_MANAGEMENT_COMMAND_HANDLERS,
    ...FEATURE_MANAGEMENT_QUERY_HANDLERS,
    FeatureManagementAuditLogService,
    { provide: FEATURE_FLAG_REPOSITORY, useClass: PrismaFeatureFlagRepository },
  ],
  exports: [],
})
export class FeatureManagementModule {}
