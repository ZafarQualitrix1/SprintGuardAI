import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';
import {
  BA_REVIEW_CYCLE_REPOSITORY,
  IBaReviewCycleRepository,
} from '../../domain/repositories/ba-review-cycle.repository.interface';
import {
  STORY_CONTEXT_READ_REPOSITORY,
  IStoryContextReadRepository,
} from '../../domain/repositories/story-context-read.repository.interface';
import { StoryBaReviewStateEntity } from '../../domain/entities/story-ba-review-state.entity';
import { BaReviewCycleEntity } from '../../domain/entities/ba-review-cycle.entity';

export interface BaReviewStatusResult {
  state: StoryBaReviewStateEntity | null;
  activeCycle: BaReviewCycleEntity | null;
  lockedCycle: BaReviewCycleEntity | null;
  assignedBaEmail: string | null;
}

export class GetBaReviewStatusQuery {
  constructor(
    public readonly storyId: string,
    public readonly organizationId: string,
  ) {}
}

@QueryHandler(GetBaReviewStatusQuery)
export class GetBaReviewStatusHandler implements IQueryHandler<GetBaReviewStatusQuery, BaReviewStatusResult> {
  constructor(
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY)
    private readonly stateRepository: IStoryBaReviewStateRepository,
    @Inject(BA_REVIEW_CYCLE_REPOSITORY)
    private readonly cycleRepository: IBaReviewCycleRepository,
    @Inject(STORY_CONTEXT_READ_REPOSITORY)
    private readonly storyContextRepository: IStoryContextReadRepository,
  ) {}

  async execute(query: GetBaReviewStatusQuery): Promise<BaReviewStatusResult> {
    const [state, story] = await Promise.all([
      this.stateRepository.findByStoryId(query.storyId, query.organizationId),
      this.storyContextRepository.findById(query.storyId, query.organizationId),
    ]);
    const assignedBaEmail = story?.assignedBaEmail ?? null;

    if (!state) {
      return { state: null, activeCycle: null, lockedCycle: null, assignedBaEmail };
    }

    const [activeCycle, lockedCycle] = await Promise.all([
      state.activeReviewCycleId ? this.cycleRepository.findById(state.activeReviewCycleId) : null,
      state.lockedVersionId ? this.cycleRepository.findById(state.lockedVersionId) : null,
    ]);

    return { state, activeCycle, lockedCycle, assignedBaEmail };
  }
}
