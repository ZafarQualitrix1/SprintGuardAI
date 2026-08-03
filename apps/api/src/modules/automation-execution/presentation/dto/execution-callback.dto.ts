import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CallbackTestResultDto {
  @ApiProperty() @IsString() title!: string;
  @ApiProperty({ enum: ['PASSED', 'FAILED', 'SKIPPED'] })
  @IsIn(['PASSED', 'FAILED', 'SKIPPED'])
  status!: 'PASSED' | 'FAILED' | 'SKIPPED';
  @ApiProperty() @IsInt() @Min(0) durationMs!: number;
  @ApiPropertyOptional() @IsOptional() @IsString() error?: string;
}

// Posted twice by the dispatched workflow -- see ReceiveExecutionCallbackCommand for why.
export class ExecutionCallbackDto {
  @ApiProperty({ enum: ['STARTED', 'COMPLETED'] })
  @IsIn(['STARTED', 'COMPLETED'])
  phase!: 'STARTED' | 'COMPLETED';

  @ApiPropertyOptional() @IsOptional() @IsString() githubRunId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() githubRunUrl?: string;

  @ApiPropertyOptional({ enum: ['PASSED', 'FAILED', 'ERROR', 'CANCELLED'] })
  @IsOptional()
  @IsIn(['PASSED', 'FAILED', 'ERROR', 'CANCELLED'])
  status?: 'PASSED' | 'FAILED' | 'ERROR' | 'CANCELLED';

  @ApiPropertyOptional() @IsOptional() @IsInt() totalTests?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() passedTests?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() failedTests?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() skippedTests?: number;

  @ApiPropertyOptional({ type: [CallbackTestResultDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CallbackTestResultDto)
  testResults?: CallbackTestResultDto[];

  @ApiPropertyOptional() @IsOptional() @IsString() logsText?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() errorMessage?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() reportArtifactUrl?: string;
}
