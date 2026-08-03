import { Module } from '@nestjs/common';
import { StoryAutomationExecutionController, AutomationExecutionController } from './presentation/automation-execution.controller';
import { InternalAutomationExecutionController } from './presentation/internal-automation-execution.controller';

import { AUTOMATION_EXECUTION_COMMAND_HANDLERS } from './application/commands';
import { AUTOMATION_EXECUTION_QUERY_HANDLERS } from './application/queries';
import { AUTOMATION_EXECUTION_RUN_REPOSITORY } from './domain/repositories/automation-execution-run.repository.interface';
import { AUTOMATION_RUN_CONTEXT_READ_REPOSITORY } from './domain/repositories/automation-run-context-read.repository.interface';

import { PrismaAutomationExecutionRunRepository } from './infrastructure/repositories/prisma-automation-execution-run.repository';
import { PrismaAutomationRunContextReadRepository } from './infrastructure/repositories/prisma-automation-run-context-read.repository';
import { GithubActionsService } from './infrastructure/services/github-actions.service';

// Bounded context module: Automation Execution (Enterprise Sprint Quality Platform §9/§10/§11).
// Dispatches .github/workflows/automation-execution.yml via workflow_dispatch to actually run the
// generated Playwright automation -- see GithubActionsService for why (Vercel serverless can't
// host the browser process itself).
@Module({
  controllers: [StoryAutomationExecutionController, AutomationExecutionController, InternalAutomationExecutionController],
  providers: [
    ...AUTOMATION_EXECUTION_COMMAND_HANDLERS,
    ...AUTOMATION_EXECUTION_QUERY_HANDLERS,
    GithubActionsService,
    { provide: AUTOMATION_EXECUTION_RUN_REPOSITORY, useClass: PrismaAutomationExecutionRunRepository },
    { provide: AUTOMATION_RUN_CONTEXT_READ_REPOSITORY, useClass: PrismaAutomationRunContextReadRepository },
  ],
  exports: [],
})
export class AutomationExecutionModule {}
