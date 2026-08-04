-- AI Release Readiness Algorithm (Phase 1): configurable weighted scoring engine, 7-level
-- defect severity for the bug-risk deduction table, and manual gate toggles for the
-- Regression/Deployment-checklist mandatory rules.

-- Extend DefectSeverity from (LOW, MEDIUM, HIGH, CRITICAL) to the 7-level severity model used by
-- the bug-risk deduction table (BLOCKER, CRITICAL, HIGH, MAJOR, MEDIUM, MINOR, TRIVIAL).
-- Postgres can't remove/rename enum values in place, so this uses the standard
-- rename-create-migrate-drop pattern, explicitly backfilling existing LOW rows to MINOR (the
-- closest equivalent in the new set) as part of the column type change.
ALTER TYPE "DefectSeverity" RENAME TO "DefectSeverity_old";

CREATE TYPE "DefectSeverity" AS ENUM ('BLOCKER', 'CRITICAL', 'HIGH', 'MAJOR', 'MEDIUM', 'MINOR', 'TRIVIAL');

ALTER TABLE "Defect" ALTER COLUMN "severity" DROP DEFAULT;
ALTER TABLE "Defect" ALTER COLUMN "severity" TYPE "DefectSeverity" USING (
  CASE "severity"::text
    WHEN 'LOW' THEN 'MINOR'
    WHEN 'MEDIUM' THEN 'MEDIUM'
    WHEN 'HIGH' THEN 'HIGH'
    WHEN 'CRITICAL' THEN 'CRITICAL'
  END
)::"DefectSeverity";
ALTER TABLE "Defect" ALTER COLUMN "severity" SET DEFAULT 'MEDIUM';

DROP TYPE "DefectSeverity_old";

-- AlterTable: Release Readiness mandatory gates (Rules 7/8)
ALTER TABLE "Sprint" ADD COLUMN "regressionCompleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Sprint" ADD COLUMN "deploymentChecklistComplete" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ReleaseScoringConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requirementCoverageWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "testCaseCoverageWeight" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "manualExecutionWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "automationExecutionWeight" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "bugRiskWeight" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "severityDeductions" JSONB NOT NULL,
    "manualPassRateBlockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 90,
    "automationCoverageWarnThreshold" DOUBLE PRECISION NOT NULL DEFAULT 70,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseScoringConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseScoringConfig_projectId_key" ON "ReleaseScoringConfig"("projectId");

-- AddForeignKey
ALTER TABLE "ReleaseScoringConfig" ADD CONSTRAINT "ReleaseScoringConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
