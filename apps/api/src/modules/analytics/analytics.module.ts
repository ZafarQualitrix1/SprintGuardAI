import { Module } from '@nestjs/common';
import { AnalyticsController } from './presentation/analytics.controller';

import { ANALYTICS_QUERY_HANDLERS } from './application/queries';
import { ANALYTICS_READ_REPOSITORY } from './domain/repositories/analytics-read.repository.interface';
import { PrismaAnalyticsReadRepository } from './infrastructure/repositories/prisma-analytics-read.repository';

// Bounded context module: Analytics. Read-only cross-cutting aggregation over Project/Sprint/
// CoverageMatrixEntry/ReleaseReport/RiskAssessment -- mirrors the local-read-port pattern already
// used by Release Governance's IReleaseMetricsReadRepository. Backs the dashboard home page's
// summary cards (previously a hardcoded mock, apps/web/src/features/analytics/api/use-dashboard-summary.ts)
// and the Executive Analytics page.
@Module({
  controllers: [AnalyticsController],
  providers: [
    ...ANALYTICS_QUERY_HANDLERS,
    { provide: ANALYTICS_READ_REPOSITORY, useClass: PrismaAnalyticsReadRepository },
  ],
  exports: [],
})
export class AnalyticsModule {}
