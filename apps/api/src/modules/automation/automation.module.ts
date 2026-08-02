import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TestCaseAutomationController } from './presentation/test-case-automation.controller';
import { AutomationController } from './presentation/automation.controller';
import { SprintAutomationController } from './presentation/sprint-automation.controller';

import { AUTOMATION_COMMAND_HANDLERS } from './application/commands';
import { AUTOMATION_QUERY_HANDLERS } from './application/queries';
import { AUTOMATION_GENERATION_REPOSITORY } from './domain/repositories/automation-generation.repository.interface';
import { TEST_CASE_AUTOMATION_REPOSITORY } from './domain/repositories/test-case-automation.repository.interface';

import { PrismaAutomationGenerationRepository } from './infrastructure/repositories/prisma-automation-generation.repository';
import { PrismaTestCaseAutomationRepository } from './infrastructure/repositories/prisma-test-case-automation.repository';
import { PlaywrightScaffoldService } from './infrastructure/services/playwright-scaffold.service';

// Bounded context module: Automation Codegen (Enterprise Sprint Quality Platform §5-8, §12-13).
// AI-generated Playwright API/UI automation for automatable test cases, versioned per test case
// so regeneration never loses a previous generation. Imports AiModule for AiOrchestrationService,
// same shared-service pattern as test-intelligence/requirement-intelligence.
@Module({
  imports: [AiModule],
  controllers: [TestCaseAutomationController, AutomationController, SprintAutomationController],
  providers: [
    ...AUTOMATION_COMMAND_HANDLERS,
    ...AUTOMATION_QUERY_HANDLERS,
    PlaywrightScaffoldService,
    { provide: AUTOMATION_GENERATION_REPOSITORY, useClass: PrismaAutomationGenerationRepository },
    { provide: TEST_CASE_AUTOMATION_REPOSITORY, useClass: PrismaTestCaseAutomationRepository },
  ],
  exports: [],
})
export class AutomationModule {}
