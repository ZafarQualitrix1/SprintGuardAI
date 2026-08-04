import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BugRiskBreakdownDto {
  @ApiProperty() openCounts!: Record<string, number>;
  @ApiProperty() totalDeduction!: number;
  @ApiProperty() component!: number;
}

export class MandatoryRuleFlagDto {
  @ApiProperty() rule!: string;
  @ApiProperty() message!: string;
  @ApiProperty({ enum: ['BLOCK', 'WARNING'] }) severity!: 'BLOCK' | 'WARNING';
}

export class ReleaseReportBreakdownDto {
  @ApiProperty() requirementCoveragePercent!: number;
  @ApiProperty() totalRequirements!: number;
  @ApiProperty() coveredRequirements!: number;

  @ApiProperty() testCaseCoveragePercent!: number;
  @ApiProperty() totalTestCases!: number;
  @ApiProperty() approvedTestCases!: number;

  @ApiProperty() manualPassRate!: number;
  @ApiProperty() manualExecutedCount!: number;
  @ApiProperty() manualPassedCount!: number;
  @ApiProperty() manualFailedCount!: number;
  @ApiProperty() manualPendingCount!: number;

  @ApiProperty() automationPassRate!: number;
  @ApiProperty() automationExecutedCount!: number;
  @ApiProperty() automationPassedCount!: number;
  @ApiProperty() automationFailedCount!: number;

  @ApiProperty({ type: BugRiskBreakdownDto }) bugRisk!: BugRiskBreakdownDto;

  @ApiProperty() regressionCompleted!: boolean;
  @ApiProperty() deploymentChecklistComplete!: boolean;

  @ApiProperty() riskCategory!: string;
  @ApiProperty() releaseStatus!: string;
  @ApiProperty() deploymentProbability!: number;
  @ApiProperty() deploymentLabel!: string;
  @ApiProperty({ type: [MandatoryRuleFlagDto] }) mandatoryFlags!: MandatoryRuleFlagDto[];

  @ApiProperty() coveragePercent!: number;
  @ApiProperty() executionPassRate!: number;
  @ApiProperty() executedCount!: number;
  @ApiProperty() passedCount!: number;
  @ApiProperty() failedCount!: number;
}

export class ReleaseReportDto {
  @ApiProperty() id!: string;
  @ApiProperty() sprintId!: string;
  @ApiProperty() readinessScore!: number;
  @ApiPropertyOptional({ nullable: true }) executiveSummary!: string | null;
  @ApiProperty({ type: ReleaseReportBreakdownDto }) breakdown!: ReleaseReportBreakdownDto;
  @ApiProperty() status!: string;
  @ApiProperty() createdAt!: string;
}
