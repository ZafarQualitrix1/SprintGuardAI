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
}
