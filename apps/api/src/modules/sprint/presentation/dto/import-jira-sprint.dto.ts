import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SmartImportSelectionDto } from './smart-import-selection.dto';

export class ImportJiraSprintDto {
  @ApiProperty()
  @IsString()
  projectId!: string;

  @ApiProperty({ description: 'Integration connection id returned by POST /integrations/jira/connect' })
  @IsString()
  connectionId!: string;

  @ApiProperty({ description: 'Jira sprint id or full board URL containing ?sprintId=...' })
  @IsString()
  @MinLength(1)
  reference!: string;

  @ApiPropertyOptional({
    type: SmartImportSelectionDto,
    description: 'Smart Sprint Import (§2) selection -- omit to import everything with default fields.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SmartImportSelectionDto)
  smartImport?: SmartImportSelectionDto;
}
