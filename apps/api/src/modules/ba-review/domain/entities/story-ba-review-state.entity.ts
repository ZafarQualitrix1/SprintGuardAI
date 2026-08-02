export type BaReviewStatus =
  | 'PENDING_REVIEW'
  | 'AWAITING_APPROVAL'
  | 'FEEDBACK_RECEIVED'
  | 'REGENERATION_IN_PROGRESS'
  | 'APPROVED';

export class StoryBaReviewStateEntity {
  constructor(
    public readonly id: string,
    public readonly storyId: string,
    public readonly organizationId: string,
    public readonly status: BaReviewStatus,
    public readonly currentVersion: number,
    public readonly isLocked: boolean,
    public readonly activeReviewCycleId: string | null,
    public readonly lockedVersionId: string | null,
    public readonly reviewCycleCount: number,
    public readonly latestReviewerName: string | null,
    public readonly latestReviewerUserId: string | null,
    public readonly lastReviewAt: Date | null,
    public readonly lockedAt: Date | null,
    public readonly unlockedBy: string | null,
    public readonly unlockedAt: Date | null,
    public readonly unlockReason: string | null,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
