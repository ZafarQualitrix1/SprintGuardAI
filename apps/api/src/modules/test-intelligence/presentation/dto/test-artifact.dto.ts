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
}

export class TestScenarioDto {
  @ApiProperty() id!: string;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty() priority!: string;
  @ApiProperty({ type: [TestCaseDto] }) testCases!: TestCaseDto[];
}
