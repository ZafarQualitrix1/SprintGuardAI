import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePromptDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(100) capability!: string;
  @ApiProperty() @IsString() @IsNotEmpty() agentKey!: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(150) name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) tags?: string[];
  @ApiProperty() @IsString() @IsNotEmpty() template!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() jsonSchema?: Record<string, unknown>;
}

export class CreatePromptVersionDto {
  @ApiProperty() @IsString() @IsNotEmpty() template!: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() jsonSchema?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() changeSummary?: string;
}

export class UpdatePromptDraftDto {
  @ApiPropertyOptional() @IsOptional() @IsString() template?: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() jsonSchema?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() category?: string;
  @ApiPropertyOptional({ type: [String] }) @IsOptional() @IsArray() @ArrayMaxSize(20) tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() changeSummary?: string;
}

export class ClonePromptDto {
  @ApiPropertyOptional() @IsOptional() @IsString() asNewCapability?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() asNewCapabilityAgentKey?: string;
}

export class RejectPromptDto {
  @ApiProperty() @IsString() @IsNotEmpty() rationale!: string;
}

export class ApprovePromptDto {
  @ApiPropertyOptional() @IsOptional() @IsString() rationale?: string;
}

export class RunPlaygroundDto {
  @ApiProperty() @IsString() @IsNotEmpty() promptId!: string;
  @ApiProperty() @IsObject() variables!: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsIn(['groq', 'openai', 'anthropic']) provider?: string;
}
