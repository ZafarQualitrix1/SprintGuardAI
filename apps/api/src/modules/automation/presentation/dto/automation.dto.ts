import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutomationFileDto {
  @ApiProperty() path!: string;
  @ApiProperty() content!: string;
}

export class AutomationGenerationDto {
  @ApiProperty() id!: string;
  @ApiProperty() testCaseId!: string;
  @ApiProperty() automationType!: string;
  @ApiProperty() version!: number;
  @ApiProperty() status!: string;
  @ApiProperty() frameworkVersion!: string;
  @ApiProperty() generatorVersion!: string;
  @ApiProperty() aiModelVersion!: string;
  @ApiPropertyOptional({ nullable: true }) automationReadinessScore!: number | null;
  @ApiPropertyOptional({ nullable: true }) estimatedEffortHours!: number | null;
  @ApiPropertyOptional({ nullable: true }) complexityLevel!: string | null;
  @ApiProperty({ type: [String] }) requiredPreconditions!: string[];
  @ApiProperty({ type: [String] }) missingRequirementDetails!: string[];
  @ApiProperty() createdAt!: string;
  @ApiProperty() isOutdated!: boolean;
}

export class AutomationGenerationDetailDto extends AutomationGenerationDto {
  @ApiProperty({ type: [AutomationFileDto] }) files!: AutomationFileDto[];
}

export class AutomationCandidateDto {
  @ApiProperty() testCaseId!: string;
  @ApiProperty() testCaseTitle!: string;
  @ApiProperty() storyId!: string;
  @ApiProperty() storyTitle!: string;
  @ApiProperty() priority!: string;
  @ApiProperty() testType!: string;
  @ApiProperty() automationStatus!: string;
  @ApiProperty() automationType!: string;
  @ApiPropertyOptional({ nullable: true }) apiEndpoint!: string | null;
  @ApiPropertyOptional({ nullable: true }) uiScreen!: string | null;
  @ApiPropertyOptional({ type: AutomationGenerationDto, nullable: true }) latestApi!: AutomationGenerationDto | null;
  @ApiPropertyOptional({ type: AutomationGenerationDto, nullable: true }) latestUi!: AutomationGenerationDto | null;
}

// API Automation module's grid row -- BA-approved+locked, API-type candidates only. Distinct from
// AutomationCandidateDto (the old per-sprint tab's shape) since this carries extra columns the
// spec's grid needs (displayId, storyExternalId, requestMethod, created/updated timestamps).
export class ApprovedApiAutomationCandidateDto {
  @ApiProperty() testCaseId!: string;
  @ApiPropertyOptional({ nullable: true }) displayId!: string | null;
  @ApiProperty() testCaseTitle!: string;
  @ApiProperty() storyId!: string;
  @ApiPropertyOptional({ nullable: true }) storyExternalId!: string | null;
  @ApiProperty() storyTitle!: string;
  @ApiPropertyOptional({ nullable: true }) apiEndpoint!: string | null;
  @ApiPropertyOptional({ nullable: true }) requestMethod!: string | null;
  @ApiProperty() priority!: string;
  @ApiProperty() automationStatus!: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
  @ApiPropertyOptional({ type: AutomationGenerationDto, nullable: true }) latestGeneration!: AutomationGenerationDto | null;
}
