import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsNumber, IsObject, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class UpsertAiProviderConfigDto {
  @ApiPropertyOptional({ description: 'Leave blank to keep the currently-stored key' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  apiKey?: string;

  @ApiPropertyOptional({ example: 'gemini-2.0-flash' })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiPropertyOptional({ description: 'Gemini project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(120000)
  timeoutMs?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  retryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  topP?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  topK?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxOutputTokens?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  streaming?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  safetySettings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsIn(['google', 'openai', 'anthropic'])
  fallbackProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fallbackModel?: string;
}
