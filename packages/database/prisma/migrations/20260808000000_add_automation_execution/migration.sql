-- Automation Execution Module (§9/§10/§11): tracks a run dispatched as a GitHub Actions
-- workflow_dispatch against the generated Playwright automation for one AutomationGeneration.

-- CreateEnum
CREATE TYPE "AutomationExecutionStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'ERROR', 'CANCELLED');

-- CreateTable
CREATE TABLE "AutomationExecutionRun" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "automationGenerationId" TEXT NOT NULL,
    "automationType" "AutomationType" NOT NULL,
    "environment" TEXT NOT NULL,
    "browser" TEXT,
    "tags" JSONB,
    "parallelWorkers" INTEGER NOT NULL DEFAULT 1,
    "status" "AutomationExecutionStatus" NOT NULL DEFAULT 'QUEUED',
    "githubRunId" TEXT,
    "githubRunUrl" TEXT,
    "totalTests" INTEGER,
    "passedTests" INTEGER,
    "failedTests" INTEGER,
    "skippedTests" INTEGER,
    "testResultsJson" JSONB,
    "logsText" TEXT,
    "errorMessage" TEXT,
    "reportArtifactUrl" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "triggeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationExecutionRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutomationExecutionRun_storyId_idx" ON "AutomationExecutionRun"("storyId");

-- CreateIndex
CREATE INDEX "AutomationExecutionRun_automationGenerationId_idx" ON "AutomationExecutionRun"("automationGenerationId");

-- CreateIndex
CREATE INDEX "AutomationExecutionRun_status_idx" ON "AutomationExecutionRun"("status");

-- AddForeignKey
ALTER TABLE "AutomationExecutionRun" ADD CONSTRAINT "AutomationExecutionRun_automationGenerationId_fkey" FOREIGN KEY ("automationGenerationId") REFERENCES "AutomationGeneration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
