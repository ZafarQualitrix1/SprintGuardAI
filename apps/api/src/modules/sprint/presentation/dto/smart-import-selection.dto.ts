import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const MODES = ['ENTIRE', 'SELECTED', 'BY_EPIC', 'BY_LABEL', 'BY_ASSIGNEE'] as const;

export class SmartImportSelectionDto {
  @ApiProperty({ enum: MODES })
  @IsIn(MODES)
  mode!: (typeof MODES)[number];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedExternalIds?: string[];

  @ApiPropertyOptional() @IsOptional() @IsString() epicName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() label?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignee?: string;

  @ApiProperty() @IsBoolean() includeEpics!: boolean;
  @ApiProperty() @IsBoolean() includeUserStories!: boolean;
  @ApiProperty() @IsBoolean() includeTasks!: boolean;
  @ApiProperty() @IsBoolean() includeSubtasks!: boolean;
  @ApiProperty() @IsBoolean() includeBugs!: boolean;

  @ApiProperty() @IsBoolean() includeSprintDetails!: boolean;
  @ApiProperty() @IsBoolean() includeAcceptanceCriteria!: boolean;
  @ApiProperty() @IsBoolean() includeStoryLinks!: boolean;
  @ApiProperty() @IsBoolean() includeLabels!: boolean;
  @ApiProperty() @IsBoolean() includeComponents!: boolean;
  @ApiProperty() @IsBoolean() includeStoryPoints!: boolean;
  @ApiProperty() @IsBoolean() includeAssignees!: boolean;
  @ApiProperty() @IsBoolean() includeAttachments!: boolean;
  @ApiProperty() @IsBoolean() includeComments!: boolean;
}
