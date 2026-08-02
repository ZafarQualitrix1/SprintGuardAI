import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TestStepDto {
  @ApiProperty() step!: string;
  @ApiProperty() expected!: string;
}

export class TestCaseDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: [TestStepDto] }) steps!: TestStepDto[];
  @ApiProperty() priority!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() severity!: string;
  @ApiPropertyOptional({ nullable: true }) module!: string | null;
  @ApiProperty() testType!: string;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty() automationStatus!: string;
  @ApiProperty() automationType!: string;
  @ApiPropertyOptional({ nullable: true }) apiEndpoint!: string | null;
  @ApiPropertyOptional({ nullable: true }) uiScreen!: string | null;
}

export class TestScenarioDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() priority!: string;
  @ApiProperty({ type: [TestCaseDto] }) testCases!: TestCaseDto[];
}
