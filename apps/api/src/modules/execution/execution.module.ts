import { Module } from '@nestjs/common';
import { ExecutionController } from './presentation/execution.controller';
import { TestCaseExecutionsController } from './presentation/test-case-executions.controller';
import { SprintExecutionsController } from './presentation/sprint-executions.controller';
import { StoryExecutionsController } from './presentation/story-executions.controller';

import { EXECUTION_COMMAND_HANDLERS } from './application/commands';
import { EXECUTION_QUERY_HANDLERS } from './application/queries';
import { TEST_CASE_READ_REPOSITORY } from './domain/repositories/test-case-read.repository.interface';
import { EXECUTION_REPOSITORY } from './domain/repositories/execution.repository.interface';

import { PrismaTestCaseReadRepository } from './infrastructure/repositories/prisma-test-case-read.repository';
import { PrismaExecutionRepository } from './infrastructure/repositories/prisma-execution.repository';

// Bounded context module: Execution (Solution Architecture §6). MVP scope: manual test result
// capture only -- CI/CD ingestion is a future phase.
@Module({
  controllers: [ExecutionController, TestCaseExecutionsController, SprintExecutionsController, StoryExecutionsController],
  providers: [
    ...EXECUTION_COMMAND_HANDLERS,
    ...EXECUTION_QUERY_HANDLERS,
    { provide: TEST_CASE_READ_REPOSITORY, useClass: PrismaTestCaseReadRepository },
    { provide: EXECUTION_REPOSITORY, useClass: PrismaExecutionRepository },
  ],
  exports: [],
})
export class ExecutionModule {}
