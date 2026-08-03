import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertOrganizationSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultLanguage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dateFormat?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsIn(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], { each: true })
  workingDays?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessHoursStart?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessHoursEnd?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultProjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(90)
  defaultSprintDurationDays?: number;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  storyPointScale?: number[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  autoSaveIntervalSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  importSprintsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  importUserStoriesEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  importBugsEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  importTestEvidenceEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  jiraAutoSyncEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyEmail?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifySlack?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyTeams?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyBrowser?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyRelease?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifySprintCompletion?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyBug?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyAiGeneration?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  notifyBaApproval?: boolean;

  @ApiPropertyOptional({ description: 'Omit to keep current, empty string to clear' })
  @IsOptional()
  @IsString()
  slackWebhookUrl?: string;

  @ApiPropertyOptional({ description: 'Omit to keep current, empty string to clear' })
  @IsOptional()
  @IsString()
  teamsWebhookUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  sessionTimeoutMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(6)
  @Max(64)
  passwordMinLength?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passwordRequireUppercase?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passwordRequireNumber?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  passwordRequireSymbol?: boolean;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedDomains?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedIpRanges?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  automationFramework?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  automationBrowser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  automationHeadless?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  automationParallelExecution?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(5)
  automationRetryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  automationReportFormat?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  automationScreenshotPolicy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  automationVideoPolicy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  automationExecutionEnvironment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aiPromptApprovalRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aiLoggingEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  aiAuditTrailEnabled?: boolean;
}
