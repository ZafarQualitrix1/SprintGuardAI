import { BaReviewCommentClassification, BaReviewJiraCommentEntity } from '../entities/ba-review-jira-comment.entity';

export const BA_REVIEW_JIRA_COMMENT_REPOSITORY = Symbol('IBaReviewJiraCommentRepository');

export interface UpsertBaReviewJiraCommentInput {
  jiraCommentId: string;
  authorDisplayName: string | null;
  authorAccountId: string | null;
  authorAvatarUrl: string | null;
  bodyAdf: unknown;
  bodyText: string;
  mentionedAccountIds: string[];
  attachmentFilenames: string[];
  isOwnComment: boolean;
  classifiedAs: BaReviewCommentClassification | null;
  jiraCreatedAt: Date | null;
}

export interface IBaReviewJiraCommentRepository {
  /** Idempotent per (storyId, jiraCommentId) -- re-polling the same comment updates, never duplicates. */
  upsertMany(storyId: string, organizationId: string, comments: UpsertBaReviewJiraCommentInput[]): Promise<void>;
  findByStoryId(storyId: string, organizationId: string): Promise<BaReviewJiraCommentEntity[]>;
}
