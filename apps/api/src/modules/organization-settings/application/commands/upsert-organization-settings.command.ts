import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  IOrganizationSettingsRepository,
  ORGANIZATION_SETTINGS_REPOSITORY,
  OrganizationSettingsRecord,
} from '../../domain/repositories/organization-settings.repository.interface';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';

export interface UpsertOrganizationSettingsInput {
  domain?: string | null;
  timezone?: string;
  defaultLanguage?: string;
  currency?: string;
  dateFormat?: string;
  workingDays?: string[];
  businessHoursStart?: string | null;
  businessHoursEnd?: string | null;
  defaultProjectId?: string | null;
  defaultSprintDurationDays?: number | null;
  storyPointScale?: number[];
  autoSaveIntervalSeconds?: number | null;
  importSprintsEnabled?: boolean;
  importUserStoriesEnabled?: boolean;
  importBugsEnabled?: boolean;
  importTestEvidenceEnabled?: boolean;
  jiraAutoSyncEnabled?: boolean;
  notifyEmail?: boolean;
  notifySlack?: boolean;
  notifyTeams?: boolean;
  notifyBrowser?: boolean;
  notifyRelease?: boolean;
  notifySprintCompletion?: boolean;
  notifyBug?: boolean;
  notifyAiGeneration?: boolean;
  notifyBaApproval?: boolean;
  slackWebhookUrl?: string | null; // omitted = keep current, null = clear, string = rotate
  teamsWebhookUrl?: string | null;
  sessionTimeoutMinutes?: number | null;
  passwordMinLength?: number | null;
  passwordRequireUppercase?: boolean;
  passwordRequireNumber?: boolean;
  passwordRequireSymbol?: boolean;
  allowedDomains?: string[];
  allowedIpRanges?: string[];
  automationFramework?: string | null;
  automationBrowser?: string | null;
  automationHeadless?: boolean;
  automationParallelExecution?: boolean;
  automationRetryCount?: number | null;
  automationReportFormat?: string | null;
  automationScreenshotPolicy?: string | null;
  automationVideoPolicy?: string | null;
  automationExecutionEnvironment?: string | null;
  aiPromptApprovalRequired?: boolean;
  aiLoggingEnabled?: boolean;
  aiAuditTrailEnabled?: boolean;
}

export class UpsertOrganizationSettingsCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly input: UpsertOrganizationSettingsInput,
  ) {}
}

@CommandHandler(UpsertOrganizationSettingsCommand)
export class UpsertOrganizationSettingsHandler
  implements ICommandHandler<UpsertOrganizationSettingsCommand, OrganizationSettingsRecord>
{
  constructor(
    @Inject(ORGANIZATION_SETTINGS_REPOSITORY) private readonly repository: IOrganizationSettingsRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    private readonly auditLog: OrgSettingsAuditLogService,
  ) {}

  async execute(command: UpsertOrganizationSettingsCommand): Promise<OrganizationSettingsRecord> {
    const { slackWebhookUrl, teamsWebhookUrl, ...rest } = command.input;

    const settings = await this.repository.upsert(command.organizationId, {
      ...rest,
      ...(slackWebhookUrl !== undefined
        ? { slackWebhookEncrypted: slackWebhookUrl ? this.credentialVault.encrypt(slackWebhookUrl) : null }
        : {}),
      ...(teamsWebhookUrl !== undefined
        ? { teamsWebhookEncrypted: teamsWebhookUrl ? this.credentialVault.encrypt(teamsWebhookUrl) : null }
        : {}),
    });

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'organization-settings.updated',
      'OrganizationSettings',
      settings.id,
    );

    return settings;
  }
}
