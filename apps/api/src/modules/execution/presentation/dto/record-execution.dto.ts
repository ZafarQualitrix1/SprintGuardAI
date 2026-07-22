import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

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
}
