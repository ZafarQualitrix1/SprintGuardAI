import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CoverageMatrixEntryDto {
  @ApiProperty() id!: string;
  @ApiProperty() requirementId!: string;
  @ApiProperty() requirementText!: string;
  @ApiProperty() coverageStatus!: string;
  @ApiPropertyOptional({ nullable: true }) testCaseId!: string | null;
}

export class GapDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) requirementId!: string | null;
  @ApiPropertyOptional({ nullable: true }) requirementText!: string | null;
  @ApiProperty() gapType!: string;
  @ApiProperty() severity!: string;
  @ApiProperty() description!: string;
}

export class CoverageSummaryDto {
  @ApiProperty() totalRequirements!: number;
  @ApiProperty() coveredCount!: number;
  @ApiProperty() partiallyCoveredCount!: number;
  @ApiProperty() notCoveredCount!: number;
  @ApiProperty() coveragePercent!: number;
}

export class CoverageRecommendationScenarioDto {
  @ApiProperty() requirementText!: string;
  @ApiProperty() suggestedScenario!: string;
  @ApiProperty() reason!: string;
}

export class CoverageRecommendationDto {
  @ApiProperty() qualityScore!: number;
  @ApiProperty({ type: [CoverageRecommendationScenarioDto] }) missingScenarios!: CoverageRecommendationScenarioDto[];
  @ApiProperty() summary!: string;
}

export class CoverageResultDto {
  @ApiProperty() sprintId!: string;
  @ApiProperty({ type: CoverageSummaryDto }) summary!: CoverageSummaryDto;
  @ApiProperty({ type: [CoverageMatrixEntryDto] }) entries!: CoverageMatrixEntryDto[];
  @ApiProperty({ type: [GapDto] }) gaps!: GapDto[];
  @ApiPropertyOptional({ type: CoverageRecommendationDto, nullable: true })
  aiRecommendation!: CoverageRecommendationDto | null;
  @ApiPropertyOptional({ nullable: true }) computedAt!: string | null;
}
