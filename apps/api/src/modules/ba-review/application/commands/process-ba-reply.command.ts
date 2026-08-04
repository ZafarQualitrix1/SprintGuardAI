import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotificationService } from '../../../notifications/application/services/notification.service';
import { AuditLogService } from '../../../integration/infrastructure/services/audit-log.service';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';
import {
  BA_REVIEW_CYCLE_REPOSITORY,
  IBaReviewCycleRepository,
} from '../../domain/repositories/ba-review-cycle.repository.interface';
import { isApprovalReply } from '../utils/approval-keyword-matcher.util';
import { ApproveReviewCycleCommand } from './approve-review-cycle.command';
import { RegenerateFromFeedbackCommand } from './regenerate-from-feedback.command';

export class ProcessBaReplyCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly reviewCycleId: string,
    public readonly replyText: string,
    public readonly replyAuthor: string,
    public readonly replyJiraCommentId: string,
    public readonly replyCreatedAt: Date,
  ) {}
}

// Classifies a single new Jira reply (found by SyncBaReviewThreadsCommand) as either an approval
// or feedback, and routes to the matching next step. This is the only place a new Jira comment can
// be triggered downstream (via RegenerateFromFeedbackCommand) -- polling itself never posts,
// satisfying "new comment only after receiving BA feedback, not on every poll."
@CommandHandler(ProcessBaReplyCommand)
export class ProcessBaReplyHandler implements ICommandHandler<ProcessBaReplyCommand, void> {
  private readonly logger = new Logger(ProcessBaReplyHandler.name);

  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
    @Inject(BA_REVIEW_CYCLE_REPOSITORY) private readonly cycleRepository: IBaReviewCycleRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: ProcessBaReplyCommand): Promise<void> {
    if (isApprovalReply(command.replyText)) {
      await this.commandBus.execute(
        new ApproveReviewCycleCommand(
          command.organizationId,
          command.storyId,
          command.reviewCycleId,
          command.replyAuthor,
          null,
          command.replyText,
        ),
      );
      return;
    }

    await this.cycleRepository.recordFeedback({
      id: command.reviewCycleId,
      feedbackText: command.replyText,
      feedbackAuthor: command.replyAuthor,
      feedbackJiraCommentId: command.replyJiraCommentId,
      feedbackReceivedAt: command.replyCreatedAt,
    });
    await this.stateRepository.recordReview({
      storyId: command.storyId,
      reviewerName: command.replyAuthor,
      reviewerUserId: null,
      reviewedAt: command.replyCreatedAt,
      status: 'FEEDBACK_RECEIVED',
    });

    await this.auditLogService.record(
      command.organizationId,
      null,
      'ba_review.feedback_received',
      'Story',
      command.storyId,
      undefined,
      { reviewCycleId: command.reviewCycleId, feedbackAuthor: command.replyAuthor, feedbackText: command.replyText },
    );

    try {
      const cycle = await this.cycleRepository.findById(command.reviewCycleId);
      const qaUserIds = await this.notificationService.findUserIdsByRoleKey(command.organizationId, 'QA_LEAD');
      await this.notificationService.notifyMany(qaUserIds, {
        organizationId: command.organizationId,
        type: 'ba_review.feedback_received',
        title: `BA feedback received on story ${cycle?.jiraIssueKey ?? command.storyId}`,
        body: `${command.replyAuthor} replied with feedback. SprintGuard AI is regenerating the affected test cases.`,
        payload: { storyId: command.storyId, reviewCycleId: command.reviewCycleId },
      });
    } catch (error) {
      this.logger.warn(`Failed to notify QA team of feedback for story ${command.storyId}: ${error}`);
    }

    this.commandBus
      .execute(new RegenerateFromFeedbackCommand(command.organizationId, command.storyId, command.reviewCycleId))
      .catch((error) => this.logger.error(`Regeneration from feedback failed for story ${command.storyId}: ${error}`));
  }
}
