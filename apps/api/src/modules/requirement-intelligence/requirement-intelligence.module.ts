import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { RequirementIntelligenceController } from './presentation/requirement-intelligence.controller';
import { RequirementAnalysisReportController } from './presentation/requirement-analysis-report.controller';

import { REQUIREMENT_INTELLIGENCE_COMMAND_HANDLERS } from './application/commands';
import { REQUIREMENT_INTELLIGENCE_QUERY_HANDLERS } from './application/queries';
import { REQUIREMENT_REPOSITORY } from './domain/repositories/requirement.repository.interface';
import { STORY_READ_REPOSITORY } from './domain/repositories/story-read.repository.interface';
import { REQUIREMENT_ANALYSIS_REPORT_REPOSITORY } from './domain/repositories/requirement-analysis-report.repository.interface';

import { PrismaRequirementRepository } from './infrastructure/repositories/prisma-requirement.repository';
import { PrismaStoryReadRepository } from './infrastructure/repositories/prisma-story-read.repository';
import { PrismaRequirementAnalysisReportRepository } from './infrastructure/repositories/prisma-requirement-analysis-report.repository';

// Bounded context module: Requirement Intelligence (Solution Architecture §6). Imports AiModule
// to inject AiOrchestrationService directly (shared service, not a cross-module use case) --
// unlike sprint<->integration's QueryBus pattern, this is a widely-reused utility service.
// RunDeepRequirementAnalysisHandler reaches `integration`'s FetchExternalIssueDetailQuery via the
// global QueryBus instead, same cross-module boundary the `sprint` module already uses.
@Module({
  imports: [AiModule],
  controllers: [RequirementIntelligenceController, RequirementAnalysisReportController],
  providers: [
    ...REQUIREMENT_INTELLIGENCE_COMMAND_HANDLERS,
    ...REQUIREMENT_INTELLIGENCE_QUERY_HANDLERS,
    { provide: REQUIREMENT_REPOSITORY, useClass: PrismaRequirementRepository },
    { provide: STORY_READ_REPOSITORY, useClass: PrismaStoryReadRepository },
    { provide: REQUIREMENT_ANALYSIS_REPORT_REPOSITORY, useClass: PrismaRequirementAnalysisReportRepository },
  ],
  exports: [],
})
export class RequirementIntelligenceModule {}
