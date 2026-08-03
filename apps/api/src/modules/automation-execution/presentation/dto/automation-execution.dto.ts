import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AutomationTestResultDto {
  @ApiProperty() title!: string;
  @ApiProperty() status!: string;
  @ApiProperty() durationMs!: number;
  @ApiPropertyOptional() error?: string;
}

export class AutomationExecutionRunDto {
  @ApiProperty() id!: string;
  @ApiProperty() storyId!: string;
  @ApiProperty() automationGenerationId!: string;
  @ApiProperty() automationType!: string;
  @ApiProperty() environment!: string;
  @ApiPropertyOptional({ nullable: true }) browser!: string | null;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() parallelWorkers!: number;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ nullable: true }) githubRunId!: string | null;
  @ApiPropertyOptional({ nullable: true }) githubRunUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) totalTests!: number | null;
  @ApiPropertyOptional({ nullable: true }) passedTests!: number | null;
  @ApiPropertyOptional({ nullable: true }) failedTests!: number | null;
  @ApiPropertyOptional({ nullable: true }) skippedTests!: number | null;
  @ApiProperty({ type: [AutomationTestResultDto] }) testResults!: AutomationTestResultDto[];
  @ApiPropertyOptional({ nullable: true }) logsText!: string | null;
  @ApiPropertyOptional({ nullable: true }) errorMessage!: string | null;
  @ApiPropertyOptional({ nullable: true }) reportArtifactUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) startedAt!: string | null;
  @ApiPropertyOptional({ nullable: true }) completedAt!: string | null;
  @ApiProperty() triggeredBy!: string;
  @ApiProperty() createdAt!: string;
}
