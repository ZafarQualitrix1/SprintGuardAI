import { Module } from '@nestjs/common';
import { AiOpsController } from './presentation/ai-ops.controller';
import { AI_OPS_QUERY_HANDLERS } from './application/queries';
import { AI_OPS_READ_REPOSITORY } from './domain/repositories/ai-ops-read.repository.interface';
import { PrismaAiOpsReadRepository } from './infrastructure/repositories/prisma-ai-ops-read.repository';

// Bounded context module: AiOps (AI Settings "Usage & Cost" and "Logs" tabs). Read-only --
// usage/cost/logs are all live-aggregated from AgentRun/AiResponse (owned by the Ai module's
// schema, read here via this module's own repository, same cross-bounded-context read pattern as
// the Agents module).
@Module({
  controllers: [AiOpsController],
  providers: [...AI_OPS_QUERY_HANDLERS, { provide: AI_OPS_READ_REPOSITORY, useClass: PrismaAiOpsReadRepository }],
  exports: [],
})
export class AiOpsModule {}
