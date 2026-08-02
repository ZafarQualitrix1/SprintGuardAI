import { BaReviewStatus, StoryBaReviewStateEntity } from '../entities/story-ba-review-state.entity';

export const STORY_BA_REVIEW_STATE_REPOSITORY = Symbol('IStoryBaReviewStateRepository');

export interface IStoryBaReviewStateRepository {
  findByStoryId(storyId: string, organizationId: string): Promise<StoryBaReviewStateEntity | null>;
  /** Creates the row with defaults on first-ever generation for a story; idempotent. */
  ensureForStory(storyId: string, organizationId: string): Promise<StoryBaReviewStateEntity>;
  isLocked(storyId: string, organizationId: string): Promise<boolean>;
  /** New cycle created (version = currentVersion + 1); flips status to PENDING_REVIEW. */
  startNewCycle(storyId: string, reviewCycleId: string, version: number): Promise<void>;
  setStatus(storyId: string, status: BaReviewStatus): Promise<void>;
  recordReview(input: {
    storyId: string;
    reviewerName: string;
    reviewerUserId: string | null;
    reviewedAt: Date;
    status: BaReviewStatus;
  }): Promise<void>;
  approveAndLock(input: {
    storyId: string;
    lockedVersionId: string;
    lockedAt: Date;
    reviewerName: string;
    reviewerUserId: string | null;
  }): Promise<void>;
  adminUnlock(input: { storyId: string; unlockedBy: string; reason: string }): Promise<void>;
  updateBaAssignment(input: {
    storyId: string;
    assignedBaEmail: string | null;
    assignedBaJiraAccountId: string | null;
    assignedBaAccountResolvedAt: Date | null;
  }): Promise<void>;
  listAwaitingApproval(organizationId?: string): Promise<StoryBaReviewStateEntity[]>;
}
