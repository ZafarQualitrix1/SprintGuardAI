import { Module } from '@nestjs/common';
import { PlatformController } from './presentation/platform.controller';
import { AdminDashboardController } from './presentation/admin-dashboard.controller';
import { RolesController } from './presentation/roles.controller';
import { PLATFORM_QUERY_HANDLERS } from './application/queries';
import { PLATFORM_COMMAND_HANDLERS } from './application/commands';
import { AUDIT_LOG_REPOSITORY } from './domain/repositories/audit-log.repository.interface';
import { PrismaAuditLogRepository } from './infrastructure/repositories/prisma-audit-log.repository';
import { PlatformAuditLogService } from './infrastructure/services/platform-audit-log.service';

// Bounded context module: Platform (Admin Console "Audit Logs" tab, dashboard overview cards,
// and "Roles & Permissions" matrix).
@Module({
  controllers: [PlatformController, AdminDashboardController, RolesController],
  providers: [
    ...PLATFORM_QUERY_HANDLERS,
    ...PLATFORM_COMMAND_HANDLERS,
    PlatformAuditLogService,
    { provide: AUDIT_LOG_REPOSITORY, useClass: PrismaAuditLogRepository },
  ],
  exports: [],
})
export class PlatformModule {}
