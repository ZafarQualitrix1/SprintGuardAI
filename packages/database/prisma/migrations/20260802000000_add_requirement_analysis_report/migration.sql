-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN     "sourceConnectionId" TEXT;

-- CreateTable
CREATE TABLE "RequirementAnalysisReport" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "aiProvider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isLatest" BOOLEAN NOT NULL DEFAULT true,
    "generatedBy" TEXT,
    "analysisJson" JSONB NOT NULL,
    "testCasesJson" JSONB NOT NULL,
    "coverageJson" JSONB NOT NULL,
    "confidenceScore" DOUBLE PRECISION,
    "generatedByAgentRunId" TEXT,
    "jiraSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequirementAnalysisReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RequirementAnalysisReport_storyId_isLatest_idx" ON "RequirementAnalysisReport"("storyId", "isLatest");

-- CreateIndex
CREATE INDEX "RequirementAnalysisReport_sprintId_idx" ON "RequirementAnalysisReport"("sprintId");

-- CreateIndex
CREATE INDEX "Sprint_sourceConnectionId_idx" ON "Sprint"("sourceConnectionId");

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_sourceConnectionId_fkey" FOREIGN KEY ("sourceConnectionId") REFERENCES "IntegrationConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequirementAnalysisReport" ADD CONSTRAINT "RequirementAnalysisReport_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
