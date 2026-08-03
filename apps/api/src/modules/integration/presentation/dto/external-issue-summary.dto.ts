import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Smart Sprint Import (§2) picker response shape.
export class ExternalIssueSummaryDto {
  @ApiProperty() externalId!: string;
  @ApiProperty() title!: string;
  @ApiProperty() issueType!: string;
  @ApiPropertyOptional({ nullable: true }) epicKey!: string | null;
  @ApiPropertyOptional({ nullable: true }) epicName!: string | null;
  @ApiProperty({ type: [String] }) labels!: string[];
  @ApiPropertyOptional({ nullable: true }) assignee!: string | null;
}
