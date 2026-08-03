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

export class CoverageDimensionsDto {
  @ApiProperty() requirementCoverage!: number;
  @ApiProperty() acceptanceCriteriaCoverage!: number;
  @ApiProperty() functionalCoverage!: number;
  @ApiProperty() boundaryCoverage!: number;
  @ApiProperty() negativeCoverage!: number;
  @ApiProperty() riskCoverage!: number;
  @ApiProperty() automationCoverage!: number;
}

export class TraceabilityTestCaseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() testType!: string;
  @ApiProperty() automationStatus!: string;
}

export class TraceabilityAcceptanceCriterionDto {
  @ApiProperty() id!: string;
  @ApiProperty() given!: string;
  @ApiProperty() when!: string;
  @ApiProperty() then!: string;
  @ApiProperty({ type: [TraceabilityTestCaseDto] }) testCases!: TraceabilityTestCaseDto[];
}

export class TraceabilityRequirementDto {
  @ApiProperty() requirementId!: string;
  @ApiProperty() requirementText!: string;
  @ApiProperty({ type: [TraceabilityAcceptanceCriterionDto] }) acceptanceCriteria!: TraceabilityAcceptanceCriterionDto[];
}

export class StoryCoverageResultDto {
  @ApiProperty() storyId!: string;
  @ApiProperty() storyTitle!: string;
  @ApiProperty({ type: CoverageSummaryDto }) summary!: CoverageSummaryDto;
  @ApiProperty({ type: CoverageDimensionsDto }) dimensions!: CoverageDimensionsDto;
  @ApiProperty({ type: [CoverageMatrixEntryDto] }) entries!: CoverageMatrixEntryDto[];
  @ApiProperty({ type: [GapDto] }) gaps!: GapDto[];
  @ApiProperty({ type: [String] }) missingTestScenarios!: string[];
  @ApiProperty({ type: [String] }) missingAcceptanceCriteria!: string[];
  @ApiProperty({ type: [TraceabilityRequirementDto] }) traceabilityMatrix!: TraceabilityRequirementDto[];
  @ApiPropertyOptional({ type: CoverageRecommendationDto, nullable: true })
  aiRecommendation!: CoverageRecommendationDto | null;
  @ApiProperty() computedAt!: string;
}
