-- Automation Codegen: adds test-type/automation classification fields to TestCase (so the new
-- Automation tab can filter API/UI/Regression/Smoke candidates) and a versioned
-- AutomationGeneration table (the "Automation Repository", §12) storing every AI-generated
-- Playwright framework per test case. Regeneration always inserts a new version row rather than
-- overwriting, so prior generations are never lost.

-- CreateEnum
CREATE TYPE "TestType" AS ENUM ('FUNCTIONAL', 'NEGATIVE', 'BOUNDARY', 'VALIDATION', 'BUSINESS_RULE', 'API', 'UI', 'SECURITY', 'PERFORMANCE', 'ACCESSIBILITY', 'DATABASE', 'INTEGRATION', 'REGRESSION', 'SMOKE', 'SANITY');

-- CreateEnum
CREATE TYPE "AutomationType" AS ENUM ('NONE', 'API', 'UI');

-- CreateEnum
CREATE TYPE "AutomationGenerationStatus" AS ENUM ('GENERATED', 'SAVED', 'COMMITTED');

-- AlterTable
ALTER TABLE "TestCase"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "severity" "Priority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "module" TEXT,
  ADD COLUMN "testType" "TestType" NOT NULL DEFAULT 'FUNCTIONAL',
  ADD COLUMN "tags" JSONB,
  ADD COLUMN "automationType" "AutomationType" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "apiEndpoint" TEXT,
  ADD COLUMN "uiScreen" TEXT;

-- CreateIndex
CREATE INDEX "TestCase_automationType_idx" ON "TestCase"("automationType");

-- CreateTable
CREATE TABLE "AutomationGeneration" (
    "id" TEXT NOT NULL,
    "testCaseId" TEXT NOT NULL,
    "automationType" "AutomationType" NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "AutomationGenerationStatus" NOT NULL DEFAULT 'GENERATED',
    "frameworkVersion" TEXT NOT NULL,
    "generatorVersion" TEXT NOT NULL,
    "aiModelVersion" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "automationReadinessScore" INTEGER,
    "estimatedEffortHours" DOUBLE PRECISION,
    "complexityLevel" TEXT,
    "requiredPreconditions" JSONB,
    "missingRequirementDetails" JSONB,
    "generatedByAgentRunId" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationGeneration_testCaseId_automationType_version_key" ON "AutomationGeneration"("testCaseId", "automationType", "version");

-- CreateIndex
CREATE INDEX "AutomationGeneration_testCaseId_automationType_idx" ON "AutomationGeneration"("testCaseId", "automationType");

-- AddForeignKey
ALTER TABLE "AutomationGeneration" ADD CONSTRAINT "AutomationGeneration_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
