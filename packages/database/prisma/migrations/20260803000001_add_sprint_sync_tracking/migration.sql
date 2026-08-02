-- Sprint Management: idempotent import/sync tracking. Adds soft-lifecycle fields to Sprint,
-- uniqueness on (projectId, externalId) / (sprintId, externalId) so a re-import can never create
-- a duplicate again, and a SprintSyncEvent audit trail backing "View Import History" /
-- "View Synchronization Logs".
--
-- Data cleanup before the new unique constraints: this environment already has 3 duplicate
-- "SCRUM Sprint 0" rows for the same (projectId, externalId) -- exactly the bug this migration
-- fixes going forward. Verified before writing this migration: the two older copies
-- (cms8x4udj001l9ch67lihjhrb, cms8z9q3s0004hrhafa3a4j2a) have zero attached AI data (0
-- requirements/testScenarios/executions/coverage/releaseReports/defects/analysisReports each);
-- the newest copy (cmsauo5ao0004r6h9oeszt3hx) has 2 ReleaseReports and 9
-- RequirementAnalysisReports and is kept. No other (projectId, externalId) or (sprintId,
-- externalId) duplicates exist in this environment.
DELETE FROM "Sprint" WHERE "id" IN ('cms8x4udj001l9ch67lihjhrb', 'cms8z9q3s0004hrhafa3a4j2a');

-- AlterTable
ALTER TABLE "Sprint"
  ADD COLUMN "lastSyncedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3),
  ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Sprint_projectId_externalId_key" ON "Sprint"("projectId", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Story_sprintId_externalId_key" ON "Story"("sprintId", "externalId");

-- CreateEnum
CREATE TYPE "SprintSyncAction" AS ENUM ('IMPORT', 'SYNC', 'OVERRIDE', 'RENAME', 'ARCHIVE', 'UNARCHIVE', 'DELETE');

-- CreateEnum
CREATE TYPE "SprintSyncStatus" AS ENUM ('SUCCESS', 'FAILED');

-- CreateTable
CREATE TABLE "SprintSyncEvent" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "action" "SprintSyncAction" NOT NULL,
    "status" "SprintSyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "storiesCreated" INTEGER NOT NULL DEFAULT 0,
    "storiesUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SprintSyncEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SprintSyncEvent_sprintId_createdAt_idx" ON "SprintSyncEvent"("sprintId", "createdAt");

-- AddForeignKey
ALTER TABLE "SprintSyncEvent" ADD CONSTRAINT "SprintSyncEvent_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
