import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

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
}
