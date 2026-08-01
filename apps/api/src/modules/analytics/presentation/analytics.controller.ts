import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetDashboardSummaryQuery } from '../application/queries/get-dashboard-summary.query';
import { DashboardSummaryResult } from '../domain/repositories/analytics-read.repository.interface';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';

@ApiTags('Analytics')
@Controller('dashboard')
export class AnalyticsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('summary')
  @RequirePermission('sprint:read')
  async summary(@CurrentUser() user: AuthenticatedUser): Promise<DashboardSummaryDto> {
    return this.queryBus.execute<GetDashboardSummaryQuery, DashboardSummaryResult>(
      new GetDashboardSummaryQuery(user.organizationId),
    );
  }
}
