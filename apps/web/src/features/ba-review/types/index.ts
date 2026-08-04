export type BaReviewStatus =
  | 'PENDING_REVIEW'
  | 'AWAITING_APPROVAL'
  | 'FEEDBACK_RECEIVED'
  | 'REGENERATION_IN_PROGRESS'
  | 'APPROVED';

export type BaReviewApprovalStatus = 'PENDING' | 'FEEDBACK_RECEIVED' | 'APPROVED';

export interface ImprovementSummary {
  feedbackSummary: string;
  added: { title: string; testType: string }[];
  modified: { title: string; changeReason: string }[];
  removedReasons: Record<string, string>;
  coverageImpact: string;
  automationReadinessImpact: string;
  traceabilityImpact: string;
}

export interface BaReviewCycle {
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
  improvementSummary: ImprovementSummary | null;
  feedbackText: string | null;
  feedbackAuthor: string | null;
  feedbackReceivedAt: string | null;
  approvalStatus: BaReviewApprovalStatus;
  approvedBy: string | null;
  approvalComment: string | null;
  approvedAt: string | null;
}

export interface BaReviewStatusSummary {
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
  activeCycle: BaReviewCycle | null;
  assignedBaEmail: string | null;
}

export interface BaReviewSyncLog {
  id: string;
  action: string;
  status: 'SUCCESS' | 'FAILED';
  attempt: number;
  errorMessage: string | null;
  createdAt: string;
}

export interface JiraUserMatch {
  accountId: string;
  displayName: string;
  avatarUrl: string | null;
}
