import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export enum ExecutionStatusInput {
  NOT_RUN = 'NOT_RUN',
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  BLOCKED = 'BLOCKED',
  SKIPPED = 'SKIPPED',
}

export class RecordExecutionDto {
  @ApiProperty({ enum: ExecutionStatusInput })
  @IsEnum(ExecutionStatusInput)
  status!: ExecutionStatusInput;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  evidenceUrl?: string;

  @ApiPropertyOptional({ description: 'What actually happened when the tester ran this case.' })
  @IsOptional()
  @IsString()
  actualResult?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  attachmentUrls?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  screenshotUrls?: string[];

  @ApiPropertyOptional({ description: 'Free-text ticket/bug reference, e.g. a Jira key.' })
  @IsOptional()
  @IsString()
  defectReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  executionDurationMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testerName?: string;
}
