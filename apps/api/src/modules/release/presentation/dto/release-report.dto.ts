import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReleaseReportBreakdownDto {
  @ApiProperty() coveragePercent!: number;
  @ApiProperty() executionPassRate!: number;
  @ApiProperty() totalTestCases!: number;
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
