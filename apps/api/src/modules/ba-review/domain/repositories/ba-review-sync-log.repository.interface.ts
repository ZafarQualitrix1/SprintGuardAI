import { BaReviewSyncAction, BaReviewSyncLogEntity, BaReviewSyncStatus } from '../entities/ba-review-sync-log.entity';

export const BA_REVIEW_SYNC_LOG_REPOSITORY = Symbol('IBaReviewSyncLogRepository');

export interface IBaReviewSyncLogRepository {
  record(input: {
    storyId: string;
    organizationId: string;
    reviewCycleId: string | null;
    action: BaReviewSyncAction;
    status: BaReviewSyncStatus;
    attempt: number;
    errorMessage: string | null;
  }): Promise<void>;
  findByStoryId(storyId: string, organizationId: string, limit?: number): Promise<BaReviewSyncLogEntity[]>;
}
