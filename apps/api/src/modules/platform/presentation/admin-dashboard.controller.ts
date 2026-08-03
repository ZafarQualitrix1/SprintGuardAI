import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { AdminDashboardSummary, GetAdminDashboardSummaryQuery } from '../application/queries/get-admin-dashboard-summary.query';

// Presentation layer: HTTP entrypoints only. Backs Admin Console's dashboard overview cards.
// Platform admins (admin:platform) see platform-wide aggregates across every organization; org
// admins (org:manage only) see their own organization's numbers -- same scope split as audit logs.
@ApiTags('Platform')
@Controller('admin/dashboard-summary')
export class AdminDashboardController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission('org:manage')
  async summary(@CurrentUser() user: AuthenticatedUser): Promise<AdminDashboardSummary> {
    const isPlatformWide = user.permissions.includes('admin:platform');
    return this.queryBus.execute(new GetAdminDashboardSummaryQuery(user.organizationId, isPlatformWide));
  }
}
