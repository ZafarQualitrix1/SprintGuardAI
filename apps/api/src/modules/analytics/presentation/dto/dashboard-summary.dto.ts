import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VelocityPointDto {
  @ApiProperty() sprintName!: string;
  @ApiProperty() pointsCompleted!: number;
}

export class StoryStatusBreakdownDto {
  @ApiProperty() BACKLOG!: number;
  @ApiProperty() IN_PROGRESS!: number;
  @ApiProperty() IN_REVIEW!: number;
  @ApiProperty() DONE!: number;
  @ApiProperty() BLOCKED!: number;
}

export class ExecutionStatusBreakdownDto {
  @ApiProperty() NOT_RUN!: number;
  @ApiProperty() PASSED!: number;
  @ApiProperty() FAILED!: number;
  @ApiProperty() BLOCKED!: number;
  @ApiProperty() SKIPPED!: number;
}

export class DashboardSummaryDto {
  @ApiProperty() projectsCount!: number;
  @ApiProperty() activeSprintsCount!: number;
  @ApiPropertyOptional({ nullable: true }) avgCoveragePercent!: number | null;
  @ApiProperty() openRisksCount!: number;
  @ApiPropertyOptional({ nullable: true }) releaseReadinessPercent!: number | null;
  @ApiProperty({ type: [VelocityPointDto] }) velocityTrend!: VelocityPointDto[];
  @ApiProperty() totalTestCases!: number;
  @ApiProperty() openDefectsCount!: number;
  @ApiProperty({ type: StoryStatusBreakdownDto }) storyStatusBreakdown!: StoryStatusBreakdownDto;
  @ApiProperty({ type: ExecutionStatusBreakdownDto }) executionStatusBreakdown!: ExecutionStatusBreakdownDto;
}
