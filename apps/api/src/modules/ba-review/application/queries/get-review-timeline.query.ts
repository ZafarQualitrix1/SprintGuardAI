import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  BA_REVIEW_CYCLE_REPOSITORY,
  IBaReviewCycleRepository,
} from '../../domain/repositories/ba-review-cycle.repository.interface';
import { BaReviewCycleEntity } from '../../domain/entities/ba-review-cycle.entity';

export class GetReviewTimelineQuery {
  constructor(
    public readonly storyId: string,
    public readonly organizationId: string,
  ) {}
}

@QueryHandler(GetReviewTimelineQuery)
export class GetReviewTimelineHandler implements IQueryHandler<GetReviewTimelineQuery, BaReviewCycleEntity[]> {
  constructor(
    @Inject(BA_REVIEW_CYCLE_REPOSITORY)
    private readonly cycleRepository: IBaReviewCycleRepository,
  ) {}

  execute(query: GetReviewTimelineQuery): Promise<BaReviewCycleEntity[]> {
    return this.cycleRepository.findHistoryByStoryId(query.storyId, query.organizationId);
  }
}
