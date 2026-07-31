-- Jira Connection Center: multi-workspace connection metadata + project cache.
-- Hand-written (not `prisma migrate dev`, which requires a TTY) so the siteUrl backfill for the
-- two pre-existing IntegrationConnection rows can be inserted between adding the column and
-- making it required. `email` is left nullable -- it was never stored in plaintext anywhere for
-- existing rows (only inside credentialsEncrypted), so there's nothing to backfill it from.

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'DEGRADED', 'UNHEALTHY', 'UNKNOWN');

-- AlterTable: add columns (siteUrl nullable for now, backfilled below before being required)
ALTER TABLE "IntegrationConnection"
  ADD COLUMN "siteUrl" TEXT,
  ADD COLUMN "email" TEXT,
  ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "healthStatus" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
  ADD COLUMN "lastHealthCheckAt" TIMESTAMP(3),
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT now();

-- Backfill siteUrl from the existing config JSON for rows connected before this column existed.
UPDATE "IntegrationConnection"
SET "siteUrl" = COALESCE(config ->> 'siteUrl', '')
WHERE "siteUrl" IS NULL;

-- Now safe to enforce NOT NULL.
ALTER TABLE "IntegrationConnection" ALTER COLUMN "siteUrl" SET NOT NULL;

-- Prevent duplicate workspace connections going forward (legacy NULL-email rows are exempt from
-- the uniqueness check, since Postgres treats NULL as distinct -- acceptable, duplicate
-- prevention only needs to hold for connections created after this migration).
CREATE UNIQUE INDEX "IntegrationConnection_organizationId_connectorId_siteUrl_email_key"
  ON "IntegrationConnection"("organizationId", "connectorId", "siteUrl", "email");

-- CreateTable
CREATE TABLE "IntegrationProject" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "lead" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationProject_connectionId_idx" ON "IntegrationProject"("connectionId");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationProject_connectionId_externalKey_key" ON "IntegrationProject"("connectionId", "externalKey");

-- AddForeignKey
ALTER TABLE "IntegrationProject" ADD CONSTRAINT "IntegrationProject_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "IntegrationConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
