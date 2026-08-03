import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExecutionDto {
  @ApiProperty() id!: string;
  @ApiProperty() testCaseId!: string;
  @ApiProperty() testCaseTitle!: string;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ nullable: true }) executedBy!: string | null;
  @ApiPropertyOptional({ nullable: true }) executedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) notes!: string | null;
  @ApiPropertyOptional({ nullable: true }) evidenceUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) actualResult!: string | null;
  @ApiProperty({ type: [String] }) attachmentUrls!: string[];
  @ApiProperty({ type: [String] }) screenshotUrls!: string[];
  @ApiPropertyOptional({ nullable: true }) defectReference!: string | null;
  @ApiPropertyOptional({ nullable: true }) executionDurationMs!: number | null;
  @ApiPropertyOptional({ nullable: true }) testerName!: string | null;
}
