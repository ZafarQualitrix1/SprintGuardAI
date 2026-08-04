import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ReleaseController } from './presentation/release.controller';
import { ReleaseReadinessController } from './presentation/release-readiness.controller';

import { RELEASE_COMMAND_HANDLERS } from './application/commands';
import { RELEASE_QUERY_HANDLERS } from './application/queries';
import { RELEASE_METRICS_READ_REPOSITORY } from './domain/repositories/release-metrics-read.repository.interface';
import { RELEASE_REPORT_REPOSITORY } from './domain/repositories/release-report.repository.interface';
import { RELEASE_SCORING_CONFIG_REPOSITORY } from './domain/repositories/release-scoring-config.repository.interface';
import { RELEASE_GATES_REPOSITORY } from './domain/repositories/release-gates.repository.interface';

import { PrismaReleaseMetricsReadRepository } from './infrastructure/repositories/prisma-release-metrics-read.repository';
import { PrismaReleaseReportRepository } from './infrastructure/repositories/prisma-release-report.repository';
import { PrismaReleaseScoringConfigRepository } from './infrastructure/repositories/prisma-release-scoring-config.repository';
import { PrismaReleaseGatesRepository } from './infrastructure/repositories/prisma-release-gates.repository';

// Bounded context module: Release Governance (Solution Architecture §6). Imports AiModule for the
// executive-summary narrative call (best-effort, never blocks the deterministic score).
@Module({
  imports: [AiModule],
  controllers: [ReleaseController, ReleaseReadinessController],
  providers: [
    ...RELEASE_COMMAND_HANDLERS,
    ...RELEASE_QUERY_HANDLERS,
    { provide: RELEASE_METRICS_READ_REPOSITORY, useClass: PrismaReleaseMetricsReadRepository },
    { provide: RELEASE_REPORT_REPOSITORY, useClass: PrismaReleaseReportRepository },
    { provide: RELEASE_SCORING_CONFIG_REPOSITORY, useClass: PrismaReleaseScoringConfigRepository },
    { provide: RELEASE_GATES_REPOSITORY, useClass: PrismaReleaseGatesRepository },
  ],
  exports: [],
})
export class ReleaseModule {}
