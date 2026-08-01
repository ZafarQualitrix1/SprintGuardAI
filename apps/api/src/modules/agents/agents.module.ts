import { Module } from '@nestjs/common';
import { AgentsController } from './presentation/agents.controller';
import { AGENTS_COMMAND_HANDLERS } from './application/commands';
import { AGENTS_QUERY_HANDLERS } from './application/queries';
import { AGENT_MANAGEMENT_REPOSITORY } from './domain/repositories/agent-management.repository.interface';
import { PrismaAgentManagementRepository } from './infrastructure/repositories/prisma-agent-management.repository';
import { AgentsAuditLogService } from './infrastructure/services/agents-audit-log.service';

// Bounded context module: Agents (AI Settings "Agents" tab -- enable/disable + live execution
// stats sourced from AgentRun/AiResponse, both owned by the Ai module's schema but read here via
// this module's own repository, same read-model-across-bounded-contexts pattern already used
// elsewhere in this codebase).
@Module({
  controllers: [AgentsController],
  providers: [
    ...AGENTS_COMMAND_HANDLERS,
    ...AGENTS_QUERY_HANDLERS,
    AgentsAuditLogService,
    { provide: AGENT_MANAGEMENT_REPOSITORY, useClass: PrismaAgentManagementRepository },
  ],
  exports: [],
})
export class AgentsModule {}
