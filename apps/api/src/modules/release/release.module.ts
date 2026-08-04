import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { BackgroundJobsModule } from '../background-jobs/background-jobs.module';
import { ReleaseController } from './presentation/release.controller';
import { ReleaseReadinessController } from './presentation/release-readiness.controller';

import { RELEASE_COMMAND_HANDLERS } from './application/commands';
import { RELEASE_QUERY_HANDLERS } from './application/queries';
import { RELEASE_EVENT_HANDLERS } from './application/events';
import { RELEASE_METRICS_READ_REPOSITORY } from './domain/repositories/release-metrics-read.repository.interface';
import { RELEASE_REPORT_REPOSITORY } from './domain/repositories/release-report.repository.interface';
import { RELEASE_SCORING_CONFIG_REPOSITORY } from './domain/repositories/release-scoring-config.repository.interface';
import { RELEASE_GATES_REPOSITORY } from './domain/repositories/release-gates.repository.interface';

import { PrismaReleaseMetricsReadRepository } from './infrastructure/repositories/prisma-release-metrics-read.repository';
import { PrismaReleaseReportRepository } from './infrastructure/repositories/prisma-release-report.repository';
import { PrismaReleaseScoringConfigRepository } from './infrastructure/repositories/prisma-release-scoring-config.repository';
import { PrismaReleaseGatesRepository } from './infrastructure/repositories/prisma-release-gates.repository';

// Bounded context module: Release Governance (Solution Architecture §6). Imports AiModule for the
// executive-summary narrative call (best-effort, never blocks the deterministic score), and
// BackgroundJobsModule so ReleaseMetricsChangedHandler can enqueue a debounced recompute job
// whenever another module publishes that event (real-time recalculation).
//
// NOTE: ReleaseReadinessGateway (the WebSocket push) is deliberately NOT registered here.
// This module is imported by AppModule, which both the Vercel-serverless main API
// (src/serverless.ts / src/main.ts) and the persistent worker process (src/worker.ts) share --
// a WebSocketGateway has no business being instantiated inside the serverless request path. It
// lives in its own standalone ReleaseRealtimeModule (infrastructure/gateways/release-realtime.module.ts),
// bootstrapped only by worker.ts as a second, separate Nest application.
@Module({
  imports: [AiModule, BackgroundJobsModule],
  controllers: [ReleaseController, ReleaseReadinessController],
  providers: [
    ...RELEASE_COMMAND_HANDLERS,
    ...RELEASE_QUERY_HANDLERS,
    ...RELEASE_EVENT_HANDLERS,
    { provide: RELEASE_METRICS_READ_REPOSITORY, useClass: PrismaReleaseMetricsReadRepository },
    { provide: RELEASE_REPORT_REPOSITORY, useClass: PrismaReleaseReportRepository },
    { provide: RELEASE_SCORING_CONFIG_REPOSITORY, useClass: PrismaReleaseScoringConfigRepository },
    { provide: RELEASE_GATES_REPOSITORY, useClass: PrismaReleaseGatesRepository },
  ],
  exports: [],
})
export class ReleaseModule {}
