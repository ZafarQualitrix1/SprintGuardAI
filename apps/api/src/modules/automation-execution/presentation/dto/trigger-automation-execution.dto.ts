import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TriggerAutomationExecutionDto {
  @ApiProperty() @IsString() automationGenerationId!: string;
  @ApiProperty() @IsString() environment!: string;

  @ApiPropertyOptional({ enum: ['chromium', 'firefox', 'webkit'] })
  @IsOptional()
  @IsIn(['chromium', 'firefox', 'webkit'])
  browser?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  parallelWorkers?: number;
}
