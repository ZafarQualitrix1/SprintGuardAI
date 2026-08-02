import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { PromptsController } from './presentation/prompts.controller';

import { PROMPT_MANAGEMENT_COMMAND_HANDLERS } from './application/commands';
import { PROMPT_MANAGEMENT_QUERY_HANDLERS } from './application/queries';
import { PROMPT_REPOSITORY } from './domain/repositories/prompt.repository.interface';
import { PROMPT_EXECUTION_READ_REPOSITORY } from './domain/repositories/prompt-execution-read.repository.interface';

import { PrismaPromptRepository } from './infrastructure/repositories/prisma-prompt.repository';
import { PrismaPromptExecutionReadRepository } from './infrastructure/repositories/prisma-prompt-execution-read.repository';

// Bounded context module: Prompt Management (admin governance layer over AiPrompt/PromptApproval).
// Imports AiModule for AiOrchestrationService (Playground reuses the real execution/retry/
// persistence pipeline via ExecuteAgentParams.promptOverride) and AGENT_REPOSITORY
// (capability<->agent lookups). Everything else -- prompt CRUD, versioning, approval,
// execution/analytics reads -- is owned entirely by this module against the same Prisma tables.
@Module({
  imports: [AiModule],
  controllers: [PromptsController],
  providers: [
    ...PROMPT_MANAGEMENT_COMMAND_HANDLERS,
    ...PROMPT_MANAGEMENT_QUERY_HANDLERS,
    { provide: PROMPT_REPOSITORY, useClass: PrismaPromptRepository },
    { provide: PROMPT_EXECUTION_READ_REPOSITORY, useClass: PrismaPromptExecutionReadRepository },
  ],
  exports: [],
})
export class PromptManagementModule {}
