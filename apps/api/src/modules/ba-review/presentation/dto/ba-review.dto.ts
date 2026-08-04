import { BaReviewApprovalStatus } from '../../domain/entities/ba-review-cycle.entity';
import { BaReviewStatus } from '../../domain/entities/story-ba-review-state.entity';

export interface BaReviewCycleDto {
  id: string;
  version: number;
  documentVersionLabel: string;
  generatedBy: string | null;
  generatedAt: string;
  aiProvider: string;
  aiModelVersion: string;
  promptVersion: string;
  totalTestCases: number;
  coveragePercent: number | null;
  automationReadinessPercent: number | null;
  jiraCommentId: string | null;
  jiraAttachmentId: string | null;
  respondsToFeedbackFromVersionId: string | null;
  improvementSummary: unknown;
  feedbackText: string | null;
  feedbackAuthor: string | null;
  feedbackReceivedAt: string | null;
  approvalStatus: BaReviewApprovalStatus;
  approvedBy: string | null;
  approvalComment: string | null;
  approvedAt: string | null;
}

export interface BaReviewStatusDto {
  status: BaReviewStatus;
  currentVersion: number;
  isLocked: boolean;
  reviewCycleCount: number;
  latestReviewerName: string | null;
  lastReviewAt: string | null;
  lockedAt: string | null;
  lockedVersionLabel: string | null;
  approvedBy: string | null;
  approvalComment: string | null;
  activeCycle: BaReviewCycleDto | null;
  assignedBaEmail: string | null;
}

export interface BaReviewSyncLogDto {
  id: string;
  action: string;
  status: string;
  attempt: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface ApproveReviewCycleDto {
  approvalComment: string;
}

export interface RequestChangesDto {
  feedbackText: string;
}

export interface AdminUnlockDto {
  reason: string;
}

export interface UpdateBaAssignmentDto {
  assignedBaEmail: string | null;
}

// Submitted as multipart/form-data (the optional attachment requires it) -- ccMentions arrives as
// a JSON-stringified array since multipart fields are otherwise plain strings.
export interface SubmitForReviewDto {
  mentionAccountId: string;
  mentionDisplayName: string;
  ccMentions?: string;
  summary: string;
  comment?: string;
}

export interface AuditTrailEntryDto {
  id: string;
  actorEmail: string | null;
  action: string;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export interface BaReviewJiraCommentDto {
  id: string;
  jiraCommentId: string;
  authorDisplayName: string | null;
  authorAccountId: string | null;
  authorAvatarUrl: string | null;
  bodyText: string;
  mentionedAccountIds: string[];
  attachmentFilenames: string[];
  isOwnComment: boolean;
  classifiedAs: 'APPROVAL' | 'FEEDBACK' | null;
  jiraCreatedAt: string | null;
}
