import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { FetchExternalIssueDetailQuery } from '../../../integration/application/queries/fetch-external-issue-detail.query';
import { ExternalIssueDetailPayload } from '../../../integration/application/ports/integration-connector.port';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';
import {
  BA_REVIEW_CYCLE_REPOSITORY,
  IBaReviewCycleRepository,
} from '../../domain/repositories/ba-review-cycle.repository.interface';
import {
  BA_REVIEW_SYNC_LOG_REPOSITORY,
  IBaReviewSyncLogRepository,
} from '../../domain/repositories/ba-review-sync-log.repository.interface';
import {
  STORY_CONTEXT_READ_REPOSITORY,
  IStoryContextReadRepository,
} from '../../domain/repositories/story-context-read.repository.interface';
import {
  BA_REVIEW_JIRA_COMMENT_REPOSITORY,
  IBaReviewJiraCommentRepository,
} from '../../domain/repositories/ba-review-jira-comment.repository.interface';
import { isApprovalReply } from '../utils/approval-keyword-matcher.util';
import { ProcessBaReplyCommand } from './process-ba-reply.command';

export class SyncBaReviewThreadsCommand {
  constructor(
    public readonly organizationId?: string,
    public readonly storyId?: string,
  ) {}
}

export interface SyncBaReviewThreadsResult {
  storiesChecked: number;
  repliesFound: number;
}

// Polling counterpart to Jira webhooks (this codebase's simple Basic-Auth integration has no
// webhook-registration capability) -- called on a schedule (internal-ba-review.controller's sweep,
// driven by .github/workflows/ba-review-sync.yml) or on-demand ("Sync now"). Only ever *reads*
// comments; a new Jira comment is only ever created downstream by RegenerateFromFeedbackCommand,
// itself only reachable after ProcessBaReplyCommand classifies a reply as feedback -- so polling
// itself can never create a duplicate comment.
@CommandHandler(SyncBaReviewThreadsCommand)
export class SyncBaReviewThreadsHandler implements ICommandHandler<SyncBaReviewThreadsCommand, SyncBaReviewThreadsResult> {
  private readonly logger = new Logger(SyncBaReviewThreadsHandler.name);

  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
    @Inject(BA_REVIEW_CYCLE_REPOSITORY) private readonly cycleRepository: IBaReviewCycleRepository,
    @Inject(BA_REVIEW_SYNC_LOG_REPOSITORY) private readonly syncLogRepository: IBaReviewSyncLogRepository,
    @Inject(STORY_CONTEXT_READ_REPOSITORY) private readonly storyContextRepository: IStoryContextReadRepository,
    @Inject(BA_REVIEW_JIRA_COMMENT_REPOSITORY) private readonly commentRepository: IBaReviewJiraCommentRepository,
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: SyncBaReviewThreadsCommand): Promise<SyncBaReviewThreadsResult> {
    const states = command.storyId
      ? [await this.stateRepository.findByStoryId(command.storyId, command.organizationId!)].filter(
          (state): state is NonNullable<typeof state> => state !== null && state.status === 'AWAITING_APPROVAL',
        )
      : await this.stateRepository.listAwaitingApproval(command.organizationId);

    let repliesFound = 0;

    for (const state of states) {
      try {
        if (!state.activeReviewCycleId) continue;
        const cycle = await this.cycleRepository.findById(state.activeReviewCycleId);
        if (!cycle || !cycle.jiraCommentId) continue;

        const story = await this.storyContextRepository.findById(state.storyId, state.organizationId);
        if (!story?.externalId || !story.sourceConnectionId) continue;

        const issue = await this.queryBus.execute<FetchExternalIssueDetailQuery, ExternalIssueDetailPayload>(
          new FetchExternalIssueDetailQuery(state.organizationId, story.sourceConnectionId, story.externalId),
        );

        const processedIds = new Set(await this.cycleRepository.listProcessedFeedbackCommentIds(state.storyId));

        const candidates = issue.comments
          .filter((comment) => comment.createdAt && comment.createdAt.getTime() > cycle.generatedAt.getTime())
          .filter((comment) => !comment.body.includes('SprintGuard AI'))
          .filter((comment) => !processedIds.has(comment.id))
          .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
        const newest = candidates[0];

        // Persist every comment this poll saw (purely additive to the approve/feedback dispatch
        // logic below) -- the real Jira comment-thread mirror, idempotent per jiraCommentId.
        // classifiedAs is only ever tagged on the one comment actually dispatched this poll; every
        // other comment (already-processed replies, SprintGuard's own posts, older thread history)
        // stays unclassified rather than guessing at a label nothing acted on.
        await this.commentRepository.upsertMany(
          state.storyId,
          state.organizationId,
          issue.comments.map((comment) => ({
            jiraCommentId: comment.id,
            authorDisplayName: comment.author,
            authorAccountId: comment.authorAccountId,
            authorAvatarUrl: comment.authorAvatarUrl,
            bodyAdf: comment.bodyAdf,
            bodyText: comment.body,
            mentionedAccountIds: comment.mentionedAccountIds,
            attachmentFilenames: comment.attachmentFilenames,
            isOwnComment: comment.body.includes('SprintGuard AI'),
            classifiedAs:
              newest && comment.id === newest.id
                ? (isApprovalReply(comment.body) ? 'APPROVAL' : 'FEEDBACK')
                : null,
            jiraCreatedAt: comment.createdAt,
          })),
        );

        await this.syncLogRepository.record({
          storyId: state.storyId,
          organizationId: state.organizationId,
          reviewCycleId: cycle.id,
          action: 'POLL_REPLIES',
          status: 'SUCCESS',
          attempt: 1,
          errorMessage: null,
        });

        if (newest) {
          repliesFound += 1;
          await this.commandBus.execute(
            new ProcessBaReplyCommand(
              state.organizationId,
              state.storyId,
              cycle.id,
              newest.body,
              newest.author ?? 'Unknown',
              newest.id,
              newest.createdAt ?? new Date(),
            ),
          );
        }
      } catch (error) {
        this.logger.warn(`BA review thread sync failed for story ${state.storyId}: ${error}`);
        await this.syncLogRepository.record({
          storyId: state.storyId,
          organizationId: state.organizationId,
          reviewCycleId: state.activeReviewCycleId,
          action: 'POLL_REPLIES',
          status: 'FAILED',
          attempt: 1,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { storiesChecked: states.length, repliesFound };
  }
}
