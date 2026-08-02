import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { TestIntelligenceModule } from '../test-intelligence/test-intelligence.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { IntegrationModule } from '../integration/integration.module';
import { BaReviewController } from './presentation/ba-review.controller';
import { InternalBaReviewController } from './presentation/internal-ba-review.controller';

import { BA_REVIEW_COMMAND_HANDLERS } from './application/commands';
import { BA_REVIEW_QUERY_HANDLERS } from './application/queries';
import { STORY_BA_REVIEW_STATE_REPOSITORY } from './domain/repositories/story-ba-review-state.repository.interface';
import { BA_REVIEW_CYCLE_REPOSITORY } from './domain/repositories/ba-review-cycle.repository.interface';
import { BA_REVIEW_SYNC_LOG_REPOSITORY } from './domain/repositories/ba-review-sync-log.repository.interface';
import { STORY_CONTEXT_READ_REPOSITORY } from './domain/repositories/story-context-read.repository.interface';

import { PrismaStoryBaReviewStateRepository } from './infrastructure/repositories/prisma-story-ba-review-state.repository';
import { PrismaBaReviewCycleRepository } from './infrastructure/repositories/prisma-ba-review-cycle.repository';
import { PrismaBaReviewSyncLogRepository } from './infrastructure/repositories/prisma-ba-review-sync-log.repository';
import { PrismaStoryContextReadRepository } from './infrastructure/repositories/prisma-story-context-read.repository';
import { StoryCoverageLookupService } from './infrastructure/services/story-coverage-lookup.service';
import { DocumentBuilderService } from './application/services/document-builder.service';
import { ResolveBaAccountService } from './application/services/resolve-ba-account.service';
import { PostReviewCommentService } from './application/services/post-review-comment.service';

// Bounded context module: BA Review Workflow -- mandatory Business-Analyst approval gate for
// AI-generated test cases, over Jira. Imports AiModule (AiOrchestrationService, shared-service
// pattern), TestIntelligenceModule (TEST_CASE_REPOSITORY/TEST_SCENARIO_REPOSITORY, needed directly
// for the feedback-driven changeset), NotificationsModule and IntegrationModule's AuditLogService
// (same shared-provider pattern). Reaches `integration`'s connector-wrapping commands/queries
// (PostIssueCommentCommand, UploadIssueAttachmentCommand, ResolveExternalUserQuery,
// FetchExternalIssueDetailQuery) via the global CommandBus/QueryBus instead, same cross-module
// boundary requirement-intelligence already uses.
@Module({
  imports: [AiModule, TestIntelligenceModule, NotificationsModule, IntegrationModule],
  controllers: [BaReviewController, InternalBaReviewController],
  providers: [
    ...BA_REVIEW_COMMAND_HANDLERS,
    ...BA_REVIEW_QUERY_HANDLERS,
    { provide: STORY_BA_REVIEW_STATE_REPOSITORY, useClass: PrismaStoryBaReviewStateRepository },
    { provide: BA_REVIEW_CYCLE_REPOSITORY, useClass: PrismaBaReviewCycleRepository },
    { provide: BA_REVIEW_SYNC_LOG_REPOSITORY, useClass: PrismaBaReviewSyncLogRepository },
    { provide: STORY_CONTEXT_READ_REPOSITORY, useClass: PrismaStoryContextReadRepository },
    StoryCoverageLookupService,
    DocumentBuilderService,
    ResolveBaAccountService,
    PostReviewCommentService,
  ],
  exports: [],
})
export class BaReviewModule {}
