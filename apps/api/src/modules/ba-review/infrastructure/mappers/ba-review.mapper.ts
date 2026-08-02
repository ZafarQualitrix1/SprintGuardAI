import { StoryBaReviewState as PrismaStoryBaReviewState, BaReviewCycle as PrismaBaReviewCycle, BaReviewSyncLog as PrismaBaReviewSyncLog } from '@sprintguard/database';
import { StoryBaReviewStateEntity } from '../../domain/entities/story-ba-review-state.entity';
import {
  BaReviewCycleEntity,
  ImprovementSummary,
  TestCaseDistribution,
  TestCaseSnapshotEntry,
} from '../../domain/entities/ba-review-cycle.entity';
import { BaReviewSyncLogEntity } from '../../domain/entities/ba-review-sync-log.entity';

export function toStoryBaReviewStateEntity(row: PrismaStoryBaReviewState): StoryBaReviewStateEntity {
  return new StoryBaReviewStateEntity(
    row.id,
    row.storyId,
    row.organizationId,
    row.status,
    row.currentVersion,
    row.isLocked,
    row.activeReviewCycleId,
    row.lockedVersionId,
    row.reviewCycleCount,
    row.latestReviewerName,
    row.latestReviewerUserId,
    row.lastReviewAt,
    row.lockedAt,
    row.unlockedBy,
    row.unlockedAt,
    row.unlockReason,
    row.createdAt,
    row.updatedAt,
  );
}

export function toBaReviewCycleEntity(row: PrismaBaReviewCycle): BaReviewCycleEntity {
  return new BaReviewCycleEntity(
    row.id,
    row.storyBaReviewStateId,
    row.storyId,
    row.organizationId,
    row.version,
    row.documentVersionLabel,
    row.generatedBy,
    row.generatedAt,
    row.aiProvider,
    row.aiModelVersion,
    row.promptVersion,
    row.requirementAnalysisReportId,
    row.testCasesSnapshotJson as unknown as TestCaseSnapshotEntry[],
    row.distributionJson as unknown as TestCaseDistribution,
    row.totalTestCases,
    row.coveragePercent,
    row.automationReadinessPercent,
    row.jiraIssueKey,
    row.jiraCommentId,
    row.jiraAttachmentId,
    row.respondsToFeedbackFromVersionId,
    (row.improvementSummaryJson as unknown as ImprovementSummary | null) ?? null,
    row.feedbackText,
    row.feedbackAuthor,
    row.feedbackJiraCommentId,
    row.feedbackReceivedAt,
    row.approvalStatus,
    row.approvedBy,
    row.approvedByUserId,
    row.approvalComment,
    row.approvedAt,
    row.createdAt,
    row.updatedAt,
  );
}

export function toBaReviewSyncLogEntity(row: PrismaBaReviewSyncLog): BaReviewSyncLogEntity {
  return new BaReviewSyncLogEntity(
    row.id,
    row.storyId,
    row.organizationId,
    row.reviewCycleId,
    row.action,
    row.status,
    row.attempt,
    row.errorMessage,
    row.createdAt,
  );
}
