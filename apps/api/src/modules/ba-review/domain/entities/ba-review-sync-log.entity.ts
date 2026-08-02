export type BaReviewSyncAction =
  | 'RESOLVE_BA_ACCOUNT'
  | 'POST_INITIAL_COMMENT'
  | 'UPLOAD_ATTACHMENT'
  | 'POLL_REPLIES'
  | 'POST_FOLLOWUP_COMMENT';

export type BaReviewSyncStatus = 'SUCCESS' | 'FAILED';

export class BaReviewSyncLogEntity {
  constructor(
    public readonly id: string,
    public readonly storyId: string,
    public readonly organizationId: string,
    public readonly reviewCycleId: string | null,
    public readonly action: BaReviewSyncAction,
    public readonly status: BaReviewSyncStatus,
    public readonly attempt: number,
    public readonly errorMessage: string | null,
    public readonly createdAt: Date,
  ) {}
}
