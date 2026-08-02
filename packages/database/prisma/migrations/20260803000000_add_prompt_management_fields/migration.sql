-- AlterTable
ALTER TABLE "AiPrompt" ADD COLUMN     "category" TEXT,
ADD COLUMN     "changeSummary" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "tags" JSONB;
