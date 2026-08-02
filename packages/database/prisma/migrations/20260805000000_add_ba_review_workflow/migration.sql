-- BA Review Workflow: mandatory Business-Analyst approval gate for AI-generated test cases, over
-- Jira. StoryBaReviewState is the single lock/status aggregate per story (checked by
-- IsStoryLockedQuery before any AI regeneration); BaReviewCycle is the versioned, immutable audit
-- trail (one row per generation/regeneration, including a JSON snapshot of the test cases at that
-- version since TestCase/TestScenario rows themselves are not versioned); BaReviewSyncLog records
-- every Jira sync attempt (comment/attachment/mention/poll) for retry visibility.

-- CreateEnum
CREATE TYPE "BaReviewStatus" AS ENUM ('PENDING_REVIEW', 'AWAITING_APPROVAL', 'FEEDBACK_RECEIVED', 'REGENERATION_IN_PROGRESS', 'APPROVED');

-- CreateEnum
CREATE TYPE "BaReviewApprovalStatus" AS ENUM ('PENDING', 'FEEDBACK_RECEIVED', 'APPROVED');

-- CreateEnum
CREATE TYPE "BaReviewSyncAction" AS ENUM ('RESOLVE_BA_ACCOUNT', 'POST_INITIAL_COMMENT', 'UPLOAD_ATTACHMENT', 'POLL_REPLIES', 'POST_FOLLOWUP_COMMENT');

-- CreateEnum
CREATE TYPE "BaReviewSyncStatus" AS ENUM ('SUCCESS', 'FAILED');

-- AlterTable
ALTER TABLE "Story"
  ADD COLUMN "assignedBaEmail" TEXT,
  ADD COLUMN "assignedBaJiraAccountId" TEXT,
  ADD COLUMN "assignedBaAccountResolvedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StoryBaReviewState" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "BaReviewStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "currentVersion" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "activeReviewCycleId" TEXT,
    "lockedVersionId" TEXT,
    "reviewCycleCount" INTEGER NOT NULL DEFAULT 0,
    "latestReviewerName" TEXT,
    "latestReviewerUserId" TEXT,
    "lastReviewAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "unlockedBy" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryBaReviewState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaReviewCycle" (
    "id" TEXT NOT NULL,
    "storyBaReviewStateId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "documentVersionLabel" TEXT NOT NULL,
    "generatedBy" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiProvider" TEXT NOT NULL,
    "aiModelVersion" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "requirementAnalysisReportId" TEXT,
    "testCasesSnapshotJson" JSONB NOT NULL,
    "distributionJson" JSONB NOT NULL,
    "totalTestCases" INTEGER NOT NULL,
    "coveragePercent" DOUBLE PRECISION,
    "automationReadinessPercent" DOUBLE PRECISION,
    "jiraIssueKey" TEXT NOT NULL,
    "jiraCommentId" TEXT,
    "jiraAttachmentId" TEXT,
    "respondsToFeedbackFromVersionId" TEXT,
    "improvementSummaryJson" JSONB,
    "feedbackText" TEXT,
    "feedbackAuthor" TEXT,
    "feedbackJiraCommentId" TEXT,
    "feedbackReceivedAt" TIMESTAMP(3),
    "approvalStatus" "BaReviewApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedByUserId" TEXT,
    "approvalComment" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BaReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BaReviewSyncLog" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reviewCycleId" TEXT,
    "action" "BaReviewSyncAction" NOT NULL,
    "status" "BaReviewSyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaReviewSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StoryBaReviewState_storyId_key" ON "StoryBaReviewState"("storyId");

-- CreateIndex
CREATE INDEX "StoryBaReviewState_organizationId_status_idx" ON "StoryBaReviewState"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BaReviewCycle_storyId_version_key" ON "BaReviewCycle"("storyId", "version");

-- CreateIndex
CREATE INDEX "BaReviewCycle_storyId_approvalStatus_idx" ON "BaReviewCycle"("storyId", "approvalStatus");

-- CreateIndex
CREATE INDEX "BaReviewCycle_organizationId_idx" ON "BaReviewCycle"("organizationId");

-- CreateIndex
CREATE INDEX "BaReviewSyncLog_storyId_createdAt_idx" ON "BaReviewSyncLog"("storyId", "createdAt");

-- CreateIndex
CREATE INDEX "BaReviewSyncLog_organizationId_status_idx" ON "BaReviewSyncLog"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "StoryBaReviewState" ADD CONSTRAINT "StoryBaReviewState_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BaReviewCycle" ADD CONSTRAINT "BaReviewCycle_storyBaReviewStateId_fkey" FOREIGN KEY ("storyBaReviewStateId") REFERENCES "StoryBaReviewState"("id") ON DELETE CASCADE ON UPDATE CASCADE;
