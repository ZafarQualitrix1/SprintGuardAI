import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetAiUsageSummaryQuery } from '../application/queries/get-ai-usage-summary.query';
import { GetAiCostSummaryQuery } from '../application/queries/get-ai-cost-summary.query';
import { ListAiLogsQuery } from '../application/queries/list-ai-logs.query';
import { AiCostSummary, AiUsageSummary, ListAiLogsResult } from '../domain/repositories/ai-ops-read.repository.interface';

// Presentation layer: HTTP entrypoints only. Delegates to Application-layer query handlers --
// never touches Domain or Infrastructure directly. Backs the AI Settings "Usage & Cost" and
// "Logs" tabs; every figure here is live-aggregated from AgentRun/AiResponse, not a mock.
@ApiTags('AiOps')
@Controller('ai-ops')
export class AiOpsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('usage')
  @RequirePermission('ai-settings:manage')
  async getUsage(@CurrentUser() user: AuthenticatedUser): Promise<AiUsageSummary> {
    return this.queryBus.execute(new GetAiUsageSummaryQuery(user.organizationId));
  }

  @Get('cost')
  @RequirePermission('ai-settings:manage')
  async getCost(@CurrentUser() user: AuthenticatedUser): Promise<AiCostSummary> {
    return this.queryBus.execute(new GetAiCostSummaryQuery(user.organizationId));
  }

  @Get('logs')
  @RequirePermission('ai-settings:manage')
  async listLogs(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date?: string,
    @Query('agentKey') agentKey?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ListAiLogsResult> {
    return this.queryBus.execute(
      new ListAiLogsQuery(user.organizationId, {
        date,
        agentKey,
        provider,
        status,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      }),
    );
  }
}
