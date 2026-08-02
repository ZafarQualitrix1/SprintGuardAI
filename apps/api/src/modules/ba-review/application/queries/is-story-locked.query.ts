import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';

// The cross-module enforcement hook: RunTestGenerationHandler, RunRequirementIntelligenceAgentHandler,
// and RunDeepRequirementAnalysisHandler each dispatch this via QueryBus (not a NestJS module import,
// same cross-boundary pattern requirement-intelligence already uses for FetchExternalIssueDetailQuery)
// before allowing any AI regeneration for a story.
export class IsStoryLockedQuery {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
  ) {}
}

@QueryHandler(IsStoryLockedQuery)
export class IsStoryLockedHandler implements IQueryHandler<IsStoryLockedQuery, boolean> {
  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY)
    private readonly stateRepository: IStoryBaReviewStateRepository,
  ) {}

  execute(query: IsStoryLockedQuery): Promise<boolean> {
    return this.stateRepository.isLocked(query.storyId, query.organizationId);
  }
}
