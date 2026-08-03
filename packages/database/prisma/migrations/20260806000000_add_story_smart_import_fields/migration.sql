-- Smart Sprint Import (§2): issue-type/epic/label/component classification on Story, plus a
-- self-relation for imported subtasks, so import-by-epic/label/assignee filters and the
-- User Stories/Tasks/Subtasks/Bugs content checkboxes have structured columns to filter on.

-- AlterTable
ALTER TABLE "Story"
  ADD COLUMN "issueType" TEXT NOT NULL DEFAULT 'Story',
  ADD COLUMN "epicKey" TEXT,
  ADD COLUMN "epicName" TEXT,
  ADD COLUMN "labels" JSONB,
  ADD COLUMN "components" JSONB,
  ADD COLUMN "parentStoryId" TEXT;

-- CreateIndex
CREATE INDEX "Story_parentStoryId_idx" ON "Story"("parentStoryId");

-- AddForeignKey
ALTER TABLE "Story" ADD CONSTRAINT "Story_parentStoryId_fkey" FOREIGN KEY ("parentStoryId") REFERENCES "Story"("id") ON DELETE SET NULL ON UPDATE CASCADE;
