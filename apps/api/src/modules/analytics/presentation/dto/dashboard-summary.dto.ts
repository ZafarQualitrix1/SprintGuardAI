import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VelocityPointDto {
  @ApiProperty() sprintName!: string;
  @ApiProperty() pointsCompleted!: number;
}

export class DashboardSummaryDto {
  @ApiProperty() projectsCount!: number;
  @ApiProperty() activeSprintsCount!: number;
  @ApiPropertyOptional({ nullable: true }) avgCoveragePercent!: number | null;
  @ApiProperty() openRisksCount!: number;
  @ApiPropertyOptional({ nullable: true }) releaseReadinessPercent!: number | null;
  @ApiProperty({ type: [VelocityPointDto] }) velocityTrend!: VelocityPointDto[];
}
