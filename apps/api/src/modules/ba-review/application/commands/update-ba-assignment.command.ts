import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';

export class UpdateBaAssignmentCommand {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly assignedBaEmail: string | null,
  ) {}
}

// Clears the cached Jira accountId whenever the assigned BA's email changes, so the next review
// cycle re-resolves the mention against the new person instead of @mentioning the previous BA.
@CommandHandler(UpdateBaAssignmentCommand)
export class UpdateBaAssignmentHandler implements ICommandHandler<UpdateBaAssignmentCommand, void> {
  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY) private readonly stateRepository: IStoryBaReviewStateRepository,
  ) {}

  async execute(command: UpdateBaAssignmentCommand): Promise<void> {
    await this.stateRepository.updateBaAssignment({
      storyId: command.storyId,
      assignedBaEmail: command.assignedBaEmail,
      assignedBaJiraAccountId: null,
      assignedBaAccountResolvedAt: null,
    });
  }
}
