-- CreateTable
CREATE TABLE "BaReviewJiraComment" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "jiraCommentId" TEXT NOT NULL,
    "authorDisplayName" TEXT,
    "authorAccountId" TEXT,
    "authorAvatarUrl" TEXT,
    "bodyAdf" JSONB,
    "bodyText" TEXT NOT NULL,
    "mentionedAccountIds" JSONB,
    "attachmentFilenames" JSONB,
    "isOwnComment" BOOLEAN NOT NULL DEFAULT false,
    "classifiedAs" TEXT,
    "jiraCreatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BaReviewJiraComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BaReviewJiraComment_storyId_jiraCommentId_key" ON "BaReviewJiraComment"("storyId", "jiraCommentId");

-- CreateIndex
CREATE INDEX "BaReviewJiraComment_organizationId_idx" ON "BaReviewJiraComment"("organizationId");

-- CreateIndex
CREATE INDEX "BaReviewJiraComment_storyId_jiraCreatedAt_idx" ON "BaReviewJiraComment"("storyId", "jiraCreatedAt");
