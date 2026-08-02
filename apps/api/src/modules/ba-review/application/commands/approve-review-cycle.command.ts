import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
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
import { BaReviewCycleEntity } from '../../domain/entities/ba-review-cycle.entity';

export class ApproveReviewCycleCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly reviewCycleId: string,
    public readonly approvedByDisplayName: string,
    public readonly approvedByUserId: string | null,
    public readonly approvalComment: string,
  ) {}
}

// Terminal step of the review loop -- fired either from ProcessBaReplyCommand (BA replied with an
// approval keyword on Jira) or directly from the in-app "Approve" action (manual, Phase 1 path).
// Once this runs, the story is permanently locked for AI generation until an Admin unlocks it.
@CommandHandler(ApproveReviewCycleCommand)
export class ApproveReviewCycleHandler implements ICommandHandler<ApproveReviewCycleCommand, BaReviewCycleEntity> {
  private readonly logger = new Logger(ApproveReviewCycleHandler.name);

  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
    @Inject(BA_REVIEW_CYCLE_REPOSITORY) private readonly cycleRepository: IBaReviewCycleRepository,
    private readonly notificationService: NotificationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: ApproveReviewCycleCommand): Promise<BaReviewCycleEntity> {
    const cycle = await this.cycleRepository.findById(command.reviewCycleId);
    if (!cycle) {
      throw new NotFoundException('Review cycle not found');
    }

    const approvedAt = new Date();
    const approved = await this.cycleRepository.approve({
      id: command.reviewCycleId,
      approvedBy: command.approvedByDisplayName,
      approvedByUserId: command.approvedByUserId,
      approvalComment: command.approvalComment,
      approvedAt,
    });

    await this.stateRepository.approveAndLock({
      storyId: command.storyId,
      lockedVersionId: command.reviewCycleId,
      lockedAt: approvedAt,
      reviewerName: command.approvedByDisplayName,
      reviewerUserId: command.approvedByUserId,
    });

    await this.auditLogService.record(
      command.organizationId,
      command.approvedByUserId,
      'ba_review.approved',
      'Story',
      command.storyId,
      undefined,
      { reviewCycleId: command.reviewCycleId, version: cycle.documentVersionLabel, approvedBy: command.approvedByDisplayName },
    );

    // Notify Product Owner / Scrum Master role members (spec's "PO and Scrum Master" requirement).
    // No SCRUM_MASTER role exists in this codebase's RBAC catalog -- PRODUCT_MANAGER is the closest
    // analog, so only that role is notified; documented v1 limitation, not a bug.
    try {
      const poUserIds = await this.notificationService.findUserIdsByRoleKey(command.organizationId, 'PRODUCT_MANAGER');
      await this.notificationService.notifyMany(poUserIds, {
        organizationId: command.organizationId,
        type: 'ba_review.approved',
        title: `Test cases approved for story ${cycle.jiraIssueKey}`,
        body: `${command.approvedByDisplayName} approved ${cycle.documentVersionLabel} of the AI-generated test cases. The baseline is now locked.`,
        payload: { storyId: command.storyId, reviewCycleId: command.reviewCycleId },
      });
    } catch (error) {
      this.logger.warn(`Failed to notify PO/Scrum Master of approval for story ${command.storyId}: ${error}`);
    }

    return approved;
  }
}
