import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { CoverageController } from './presentation/coverage.controller';

import { COVERAGE_COMMAND_HANDLERS } from './application/commands';
import { COVERAGE_QUERY_HANDLERS } from './application/queries';
import { COVERAGE_SOURCE_READ_REPOSITORY } from './domain/repositories/coverage-source-read.repository.interface';
import { COVERAGE_REPOSITORY } from './domain/repositories/coverage.repository.interface';

import { PrismaCoverageSourceReadRepository } from './infrastructure/repositories/prisma-coverage-source-read.repository';
import { PrismaCoverageRepository } from './infrastructure/repositories/prisma-coverage.repository';

// Bounded context module: Test Coverage. Owns CoverageMatrixEntry/Gap (Release Governance
// cross-reads them read-only via IReleaseMetricsReadRepository, same pattern this module itself
// uses to cross-read the Requirement/TestCase chain via ICoverageSourceReadRepository). Imports
// AiModule for the best-effort coverage-recommendation narrative call.
@Module({
  imports: [AiModule],
  controllers: [CoverageController],
  providers: [
    ...COVERAGE_COMMAND_HANDLERS,
    ...COVERAGE_QUERY_HANDLERS,
    { provide: COVERAGE_SOURCE_READ_REPOSITORY, useClass: PrismaCoverageSourceReadRepository },
    { provide: COVERAGE_REPOSITORY, useClass: PrismaCoverageRepository },
  ],
  exports: [],
})
export class CoverageModule {}
