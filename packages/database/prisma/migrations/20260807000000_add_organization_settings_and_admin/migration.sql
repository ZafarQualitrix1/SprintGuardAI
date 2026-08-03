-- Organization Settings + Admin Console foundation: a single per-org OrganizationSettings row,
-- an Invitation model for the member-invite flow (no email delivery exists yet, so invites are a
-- shareable link), and User.lastLoginAt for login history. Purely additive -- no existing tables
-- or columns altered. Hand-written (see 20260731000000_add_integration_connection_center and
-- 20260802000000_add_ai_settings for precedent) since `prisma migrate dev` requires an
-- interactive shadow-database session this sandbox can't reliably reach.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'en',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "dateFormat" TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
    "workingDays" JSONB,
    "businessHoursStart" TEXT DEFAULT '09:00',
    "businessHoursEnd" TEXT DEFAULT '18:00',
    "defaultProjectId" TEXT,
    "defaultSprintDurationDays" INTEGER DEFAULT 14,
    "storyPointScale" JSONB,
    "autoSaveIntervalSeconds" INTEGER DEFAULT 30,
    "importSprintsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "importUserStoriesEnabled" BOOLEAN NOT NULL DEFAULT true,
    "importBugsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "importTestEvidenceEnabled" BOOLEAN NOT NULL DEFAULT false,
    "jiraAutoSyncEnabled" BOOLEAN NOT NULL DEFAULT false,
    "notifyEmail" BOOLEAN NOT NULL DEFAULT false,
    "notifySlack" BOOLEAN NOT NULL DEFAULT false,
    "notifyTeams" BOOLEAN NOT NULL DEFAULT false,
    "notifyBrowser" BOOLEAN NOT NULL DEFAULT true,
    "notifyRelease" BOOLEAN NOT NULL DEFAULT true,
    "notifySprintCompletion" BOOLEAN NOT NULL DEFAULT true,
    "notifyBug" BOOLEAN NOT NULL DEFAULT true,
    "notifyAiGeneration" BOOLEAN NOT NULL DEFAULT true,
    "notifyBaApproval" BOOLEAN NOT NULL DEFAULT true,
    "slackWebhookEncrypted" TEXT,
    "teamsWebhookEncrypted" TEXT,
    "sessionTimeoutMinutes" INTEGER DEFAULT 60,
    "passwordMinLength" INTEGER DEFAULT 10,
    "passwordRequireUppercase" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireNumber" BOOLEAN NOT NULL DEFAULT true,
    "passwordRequireSymbol" BOOLEAN NOT NULL DEFAULT false,
    "allowedDomains" JSONB,
    "allowedIpRanges" JSONB,
    "automationFramework" TEXT DEFAULT 'playwright',
    "automationBrowser" TEXT DEFAULT 'chromium',
    "automationHeadless" BOOLEAN NOT NULL DEFAULT true,
    "automationParallelExecution" BOOLEAN NOT NULL DEFAULT false,
    "automationRetryCount" INTEGER DEFAULT 1,
    "automationReportFormat" TEXT DEFAULT 'html',
    "automationScreenshotPolicy" TEXT DEFAULT 'on-failure',
    "automationVideoPolicy" TEXT DEFAULT 'off',
    "automationExecutionEnvironment" TEXT DEFAULT 'local',
    "aiPromptApprovalRequired" BOOLEAN NOT NULL DEFAULT false,
    "aiLoggingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiAuditTrailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_tokenHash_key" ON "Invitation"("tokenHash");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_status_idx" ON "Invitation"("organizationId", "status");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
