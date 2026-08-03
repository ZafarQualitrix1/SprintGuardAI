-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "testCaseSequenceCounter" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "TestCase" ADD COLUMN     "displayId" TEXT,
ADD COLUMN     "testObjective" TEXT,
ADD COLUMN     "preconditions" JSONB,
ADD COLUMN     "dependencies" TEXT,
ADD COLUMN     "requestMethod" TEXT,
ADD COLUMN     "requestPayload" JSONB,
ADD COLUMN     "expectedStatusCode" INTEGER,
ADD COLUMN     "expectedResponse" TEXT,
ADD COLUMN     "remarks" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TestCase_displayId_key" ON "TestCase"("displayId");
