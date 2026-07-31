import { ApiProperty } from '@nestjs/swagger';

// Import wizard step 4 response shape -- `externalId` becomes `reference` for step 5's
// POST /sprints/import/jira call.
export class ExternalSprintOptionDto {
  @ApiProperty() externalId!: string;
  @ApiProperty() name!: string;
  @ApiProperty() state!: string;
  @ApiProperty({ nullable: true }) startDate!: string | null;
  @ApiProperty({ nullable: true }) endDate!: string | null;
}
