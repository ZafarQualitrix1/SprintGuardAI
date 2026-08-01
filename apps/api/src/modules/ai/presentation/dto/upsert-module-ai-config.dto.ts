import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpsertModuleAiConfigDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'null/omitted = use the organization default provider' })
  @IsOptional()
  @IsIn(['google', 'openai', 'anthropic'])
  provider?: string;

  @ApiPropertyOptional({ description: 'null/omitted = use the ModelRegistry default for this provider/capability' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxTokens?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  retryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(120000)
  timeoutMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  streaming?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['google', 'openai', 'anthropic'])
  fallbackProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fallbackModel?: string;
}
