import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, Max, Min, ValidateNested } from 'class-validator';

export class SeverityDeductionsDto {
  @ApiProperty() @IsNumber() @Max(0) BLOCKER!: number;
  @ApiProperty() @IsNumber() @Max(0) CRITICAL!: number;
  @ApiProperty() @IsNumber() @Max(0) HIGH!: number;
  @ApiProperty() @IsNumber() @Max(0) MAJOR!: number;
  @ApiProperty() @IsNumber() @Max(0) MEDIUM!: number;
  @ApiProperty() @IsNumber() @Max(0) MINOR!: number;
  @ApiProperty() @IsNumber() @Max(0) TRIVIAL!: number;
}

export class UpdateReleaseScoringConfigDto {
  @ApiProperty() @IsNumber() @Min(0) @Max(100) requirementCoverageWeight!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) testCaseCoverageWeight!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) manualExecutionWeight!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) automationExecutionWeight!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) bugRiskWeight!: number;

  @ApiProperty({ type: SeverityDeductionsDto })
  @ValidateNested()
  @Type(() => SeverityDeductionsDto)
  severityDeductions!: SeverityDeductionsDto;

  @ApiProperty() @IsNumber() @Min(0) @Max(100) manualPassRateBlockThreshold!: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(100) automationCoverageWarnThreshold!: number;
}

export class ReleaseScoringConfigDto extends UpdateReleaseScoringConfigDto {
  @ApiProperty() projectId!: string;
  @ApiProperty() isCustomized!: boolean;
}

export class UpdateSprintReleaseGatesDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  regressionCompleted?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  deploymentChecklistComplete?: boolean;
}

export class SprintReleaseGatesDto {
  @ApiProperty() regressionCompleted!: boolean;
  @ApiProperty() deploymentChecklistComplete!: boolean;
}
