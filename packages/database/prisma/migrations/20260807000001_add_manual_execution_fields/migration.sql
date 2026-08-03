-- Manual Execution Module (§8) rich capture fields: actual result, attachments/screenshots
-- (kept separate to match the spec's distinct fields), a free-text defect reference (not a
-- relational FK -- a tester may reference a ticket that doesn't exist as a Defect row yet),
-- execution duration, and tester name (captured client-side from the logged-in user, editable).

-- AlterTable
ALTER TABLE "Execution"
  ADD COLUMN "actualResult" TEXT,
  ADD COLUMN "attachmentUrls" JSONB,
  ADD COLUMN "screenshotUrls" JSONB,
  ADD COLUMN "defectReference" TEXT,
  ADD COLUMN "executionDurationMs" INTEGER,
  ADD COLUMN "testerName" TEXT;
