import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { AuditLogService } from '../../../integration/infrastructure/services/audit-log.service';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';

export class AdminUnlockStoryCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly actorId: string,
    public readonly reason: string,
  ) {}
}

// The only way an approved/locked story can accept AI generation again -- requires the
// test:admin-unlock permission (enforced at the controller). Preserves all prior BaReviewCycle
// history; the next generation simply creates version = currentVersion + 1, same as a normal
// feedback-driven regeneration.
@CommandHandler(AdminUnlockStoryCommand)
export class AdminUnlockStoryHandler implements ICommandHandler<AdminUnlockStoryCommand, void> {
  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async execute(command: AdminUnlockStoryCommand): Promise<void> {
    await this.stateRepository.adminUnlock({
      storyId: command.storyId,
      unlockedBy: command.actorId,
      reason: command.reason,
    });

    await this.auditLogService.record(
      command.organizationId,
      command.actorId,
      'ba_review.admin_unlock',
      'Story',
      command.storyId,
      undefined,
      { reason: command.reason },
    );
  }
}
