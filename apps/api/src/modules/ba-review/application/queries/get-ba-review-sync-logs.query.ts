import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  BA_REVIEW_SYNC_LOG_REPOSITORY,
  IBaReviewSyncLogRepository,
} from '../../domain/repositories/ba-review-sync-log.repository.interface';
import { BaReviewSyncLogEntity } from '../../domain/entities/ba-review-sync-log.entity';

export class GetBaReviewSyncLogsQuery {
  constructor(
    public readonly storyId: string,
    public readonly organizationId: string,
  ) {}
}

@QueryHandler(GetBaReviewSyncLogsQuery)
export class GetBaReviewSyncLogsHandler implements IQueryHandler<GetBaReviewSyncLogsQuery, BaReviewSyncLogEntity[]> {
  constructor(
    @Inject(BA_REVIEW_SYNC_LOG_REPOSITORY)
    private readonly syncLogRepository: IBaReviewSyncLogRepository,
  ) {}

  execute(query: GetBaReviewSyncLogsQuery): Promise<BaReviewSyncLogEntity[]> {
    return this.syncLogRepository.findByStoryId(query.storyId, query.organizationId);
  }
}
