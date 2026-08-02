import {
  BaReviewCycleEntity,
  ImprovementSummary,
  TestCaseDistribution,
  TestCaseSnapshotEntry,
} from '../entities/ba-review-cycle.entity';

export const BA_REVIEW_CYCLE_REPOSITORY = Symbol('IBaReviewCycleRepository');

export interface CreateBaReviewCycleInput {
  storyBaReviewStateId: string;
  storyId: string;
  organizationId: string;
  version: number;
  generatedBy: string | null;
  aiProvider: string;
  aiModelVersion: string;
  promptVersion: string;
  requirementAnalysisReportId: string | null;
  testCasesSnapshot: TestCaseSnapshotEntry[];
  distribution: TestCaseDistribution;
  totalTestCases: number;
  coveragePercent: number | null;
  automationReadinessPercent: number | null;
  jiraIssueKey: string;
  respondsToFeedbackFromVersionId: string | null;
  improvementSummary: ImprovementSummary | null;
}

export interface IBaReviewCycleRepository {
  create(input: CreateBaReviewCycleInput): Promise<BaReviewCycleEntity>;
  findById(id: string): Promise<BaReviewCycleEntity | null>;
  findActiveForStory(storyId: string): Promise<BaReviewCycleEntity | null>;
  findHistoryByStoryId(storyId: string, organizationId: string): Promise<BaReviewCycleEntity[]>;
  setJiraPostResult(id: string, jiraCommentId: string, jiraAttachmentId: string | null): Promise<void>;
  recordFeedback(input: {
    id: string;
    feedbackText: string;
    feedbackAuthor: string;
    feedbackJiraCommentId: string;
    feedbackReceivedAt: Date;
  }): Promise<void>;
  approve(input: {
    id: string;
    approvedBy: string;
    approvedByUserId: string | null;
    approvalComment: string;
    approvedAt: Date;
  }): Promise<BaReviewCycleEntity>;
  /** All feedbackJiraCommentIds already processed for this story, for poll-dedup. */
  listProcessedFeedbackCommentIds(storyId: string): Promise<string[]>;
}
