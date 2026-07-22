import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TestIntelligenceController } from './presentation/test-intelligence.controller';

import { TEST_INTELLIGENCE_COMMAND_HANDLERS } from './application/commands';
import { TEST_INTELLIGENCE_QUERY_HANDLERS } from './application/queries';
import { ACCEPTANCE_CRITERION_READ_REPOSITORY } from './domain/repositories/acceptance-criterion-read.repository.interface';
import { TEST_SCENARIO_REPOSITORY } from './domain/repositories/test-scenario.repository.interface';
import { TEST_CASE_REPOSITORY } from './domain/repositories/test-case.repository.interface';

import { PrismaAcceptanceCriterionReadRepository } from './infrastructure/repositories/prisma-acceptance-criterion-read.repository';
import { PrismaTestScenarioRepository } from './infrastructure/repositories/prisma-test-scenario.repository';
import { PrismaTestCaseRepository } from './infrastructure/repositories/prisma-test-case.repository';

// Bounded context module: Test Intelligence (Solution Architecture §6). Imports AiModule for
// AiOrchestrationService, same shared-service pattern as requirement-intelligence.
@Module({
  imports: [AiModule],
  controllers: [TestIntelligenceController],
  providers: [
    ...TEST_INTELLIGENCE_COMMAND_HANDLERS,
    ...TEST_INTELLIGENCE_QUERY_HANDLERS,
    { provide: ACCEPTANCE_CRITERION_READ_REPOSITORY, useClass: PrismaAcceptanceCriterionReadRepository },
    { provide: TEST_SCENARIO_REPOSITORY, useClass: PrismaTestScenarioRepository },
    { provide: TEST_CASE_REPOSITORY, useClass: PrismaTestCaseRepository },
  ],
  exports: [],
})
export class TestIntelligenceModule {}
