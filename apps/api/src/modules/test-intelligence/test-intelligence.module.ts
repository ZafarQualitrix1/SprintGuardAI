import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IntegrationModule } from '../integration/integration.module';
import { TestIntelligenceController } from './presentation/test-intelligence.controller';

import { TEST_INTELLIGENCE_COMMAND_HANDLERS } from './application/commands';
import { TEST_INTELLIGENCE_QUERY_HANDLERS } from './application/queries';
import { ACCEPTANCE_CRITERION_READ_REPOSITORY } from './domain/repositories/acceptance-criterion-read.repository.interface';
import { TEST_SCENARIO_REPOSITORY } from './domain/repositories/test-scenario.repository.interface';
import { TEST_CASE_REPOSITORY } from './domain/repositories/test-case.repository.interface';
import { STORY_METADATA_READ_REPOSITORY } from './domain/repositories/story-metadata-read.repository.interface';

import { PrismaAcceptanceCriterionReadRepository } from './infrastructure/repositories/prisma-acceptance-criterion-read.repository';
import { PrismaTestScenarioRepository } from './infrastructure/repositories/prisma-test-scenario.repository';
import { PrismaTestCaseRepository } from './infrastructure/repositories/prisma-test-case.repository';
import { PrismaStoryMetadataReadRepository } from './infrastructure/repositories/prisma-story-metadata-read.repository';
import { TestCaseExportService } from './application/services/test-case-export.service';

// Bounded context module: Test Intelligence (Solution Architecture §6). Imports AiModule for
// AiOrchestrationService, same shared-service pattern as requirement-intelligence. IntegrationModule
// for AuditLogService (ExportTestCasesHandler logs every export) -- same shared-provider pattern
// ba-review already uses for the same service.
@Module({
  imports: [AiModule, IntegrationModule],
  controllers: [TestIntelligenceController],
  providers: [
    ...TEST_INTELLIGENCE_COMMAND_HANDLERS,
    ...TEST_INTELLIGENCE_QUERY_HANDLERS,
    { provide: ACCEPTANCE_CRITERION_READ_REPOSITORY, useClass: PrismaAcceptanceCriterionReadRepository },
    { provide: TEST_SCENARIO_REPOSITORY, useClass: PrismaTestScenarioRepository },
    { provide: TEST_CASE_REPOSITORY, useClass: PrismaTestCaseRepository },
    { provide: STORY_METADATA_READ_REPOSITORY, useClass: PrismaStoryMetadataReadRepository },
    TestCaseExportService,
  ],
  // TEST_SCENARIO_REPOSITORY/TEST_CASE_REPOSITORY exported for ba-review's
  // RegenerateFromFeedbackCommand, which needs direct read+write access to apply a targeted
  // changeset -- same "shared provider" precedent as AiModule exporting AGENT_REPOSITORY for
  // prompt-management, not the QueryBus cross-boundary pattern used for peer bounded-context reads.
  exports: [TEST_SCENARIO_REPOSITORY, TEST_CASE_REPOSITORY],
})
export class TestIntelligenceModule {}
