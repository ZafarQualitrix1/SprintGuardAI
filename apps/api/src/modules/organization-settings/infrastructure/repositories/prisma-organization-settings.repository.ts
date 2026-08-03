import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  IOrganizationSettingsRepository,
  OrganizationSettingsRecord,
  UpsertOrganizationSettingsInput,
} from '../../domain/repositories/organization-settings.repository.interface';

const DEFAULT_WORKING_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
const DEFAULT_STORY_POINT_SCALE = [1, 2, 3, 5, 8, 13];

function toRecord(row: {
  id: string;
  organizationId: string;
  domain: string | null;
  timezone: string;
  defaultLanguage: string;
  currency: string;
  dateFormat: string;
  workingDays: Prisma.JsonValue | null;
  businessHoursStart: string | null;
  businessHoursEnd: string | null;
  defaultProjectId: string | null;
  defaultSprintDurationDays: number | null;
  storyPointScale: Prisma.JsonValue | null;
  autoSaveIntervalSeconds: number | null;
  importSprintsEnabled: boolean;
  importUserStoriesEnabled: boolean;
  importBugsEnabled: boolean;
  importTestEvidenceEnabled: boolean;
  jiraAutoSyncEnabled: boolean;
  notifyEmail: boolean;
  notifySlack: boolean;
  notifyTeams: boolean;
  notifyBrowser: boolean;
  notifyRelease: boolean;
  notifySprintCompletion: boolean;
  notifyBug: boolean;
  notifyAiGeneration: boolean;
  notifyBaApproval: boolean;
  slackWebhookEncrypted: string | null;
  teamsWebhookEncrypted: string | null;
  sessionTimeoutMinutes: number | null;
  passwordMinLength: number | null;
  passwordRequireUppercase: boolean;
  passwordRequireNumber: boolean;
  passwordRequireSymbol: boolean;
  allowedDomains: Prisma.JsonValue | null;
  allowedIpRanges: Prisma.JsonValue | null;
  automationFramework: string | null;
  automationBrowser: string | null;
  automationHeadless: boolean;
  automationParallelExecution: boolean;
  automationRetryCount: number | null;
  automationReportFormat: string | null;
  automationScreenshotPolicy: string | null;
  automationVideoPolicy: string | null;
  automationExecutionEnvironment: string | null;
  aiPromptApprovalRequired: boolean;
  aiLoggingEnabled: boolean;
  aiAuditTrailEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): OrganizationSettingsRecord {
  return {
    ...row,
    workingDays: (row.workingDays as string[] | null) ?? DEFAULT_WORKING_DAYS,
    storyPointScale: (row.storyPointScale as number[] | null) ?? DEFAULT_STORY_POINT_SCALE,
    allowedDomains: (row.allowedDomains as string[] | null) ?? [],
    allowedIpRanges: (row.allowedIpRanges as string[] | null) ?? [],
    hasSlackWebhook: Boolean(row.slackWebhookEncrypted),
    hasTeamsWebhook: Boolean(row.teamsWebhookEncrypted),
  };
}

@Injectable()
export class PrismaOrganizationSettingsRepository implements IOrganizationSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrg(organizationId: string): Promise<OrganizationSettingsRecord | null> {
    const row = await this.prisma.organizationSettings.findUnique({ where: { organizationId } });
    return row ? toRecord(row) : null;
  }

  async findRawByOrg(
    organizationId: string,
  ): Promise<{ slackWebhookEncrypted: string | null; teamsWebhookEncrypted: string | null } | null> {
    return this.prisma.organizationSettings.findUnique({
      where: { organizationId },
      select: { slackWebhookEncrypted: true, teamsWebhookEncrypted: true },
    });
  }

  async upsert(
    organizationId: string,
    input: UpsertOrganizationSettingsInput,
  ): Promise<OrganizationSettingsRecord> {
    const { workingDays, storyPointScale, allowedDomains, allowedIpRanges, ...rest } = input;

    const jsonPatch: Record<string, Prisma.InputJsonValue> = {};
    if (workingDays !== undefined) jsonPatch.workingDays = workingDays as Prisma.InputJsonValue;
    if (storyPointScale !== undefined) jsonPatch.storyPointScale = storyPointScale as Prisma.InputJsonValue;
    if (allowedDomains !== undefined) jsonPatch.allowedDomains = allowedDomains as Prisma.InputJsonValue;
    if (allowedIpRanges !== undefined) jsonPatch.allowedIpRanges = allowedIpRanges as Prisma.InputJsonValue;

    const row = await this.prisma.organizationSettings.upsert({
      where: { organizationId },
      create: {
        organizationId,
        workingDays: (workingDays ?? DEFAULT_WORKING_DAYS) as Prisma.InputJsonValue,
        storyPointScale: (storyPointScale ?? DEFAULT_STORY_POINT_SCALE) as Prisma.InputJsonValue,
        allowedDomains: (allowedDomains ?? []) as Prisma.InputJsonValue,
        allowedIpRanges: (allowedIpRanges ?? []) as Prisma.InputJsonValue,
        ...rest,
      },
      update: { ...jsonPatch, ...rest },
    });

    return toRecord(row);
  }
}
