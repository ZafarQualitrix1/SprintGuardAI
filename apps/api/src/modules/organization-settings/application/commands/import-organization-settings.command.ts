import { BadRequestException, Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  IOrganizationSettingsRepository,
  ORGANIZATION_SETTINGS_REPOSITORY,
  OrganizationSettingsRecord,
} from '../../domain/repositories/organization-settings.repository.interface';
import { OrgSettingsAuditLogService } from '../../infrastructure/services/org-settings-audit-log.service';

// Same field list export produces (webhook secrets are never exported, so never imported either).
const IMPORTABLE_KEYS = new Set([
  'domain', 'timezone', 'defaultLanguage', 'currency', 'dateFormat', 'workingDays',
  'businessHoursStart', 'businessHoursEnd', 'defaultProjectId', 'defaultSprintDurationDays',
  'storyPointScale', 'autoSaveIntervalSeconds', 'importSprintsEnabled', 'importUserStoriesEnabled',
  'importBugsEnabled', 'importTestEvidenceEnabled', 'jiraAutoSyncEnabled', 'notifyEmail',
  'notifySlack', 'notifyTeams', 'notifyBrowser', 'notifyRelease', 'notifySprintCompletion',
  'notifyBug', 'notifyAiGeneration', 'notifyBaApproval', 'sessionTimeoutMinutes', 'passwordMinLength',
  'passwordRequireUppercase', 'passwordRequireNumber', 'passwordRequireSymbol', 'allowedDomains',
  'allowedIpRanges', 'automationFramework', 'automationBrowser', 'automationHeadless',
  'automationParallelExecution', 'automationRetryCount', 'automationReportFormat',
  'automationScreenshotPolicy', 'automationVideoPolicy', 'automationExecutionEnvironment',
  'aiPromptApprovalRequired', 'aiLoggingEnabled', 'aiAuditTrailEnabled',
]);

export class ImportOrganizationSettingsCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly backup: { settings?: Record<string, unknown> },
  ) {}
}

@CommandHandler(ImportOrganizationSettingsCommand)
export class ImportOrganizationSettingsHandler
  implements ICommandHandler<ImportOrganizationSettingsCommand, OrganizationSettingsRecord>
{
  constructor(
    @Inject(ORGANIZATION_SETTINGS_REPOSITORY) private readonly repository: IOrganizationSettingsRepository,
    private readonly auditLog: OrgSettingsAuditLogService,
  ) {}

  async execute(command: ImportOrganizationSettingsCommand): Promise<OrganizationSettingsRecord> {
    const rawSettings = command.backup.settings;
    if (!rawSettings || typeof rawSettings !== 'object') {
      throw new BadRequestException('Backup file is missing a "settings" object');
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(rawSettings)) {
      if (IMPORTABLE_KEYS.has(key)) {
        sanitized[key] = value;
      }
    }

    const settings = await this.repository.upsert(command.organizationId, sanitized);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'organization-settings.imported',
      'OrganizationSettings',
      settings.id,
    );

    return settings;
  }
}
