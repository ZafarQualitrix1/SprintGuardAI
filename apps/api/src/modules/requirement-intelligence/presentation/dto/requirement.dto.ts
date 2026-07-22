import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AcceptanceCriterionDto {
  @ApiProperty() id!: string;
  @ApiProperty() given!: string;
  @ApiProperty() when!: string;
  @ApiProperty() then!: string;
}

export class RequirementDto {
  @ApiProperty() id!: string;
  @ApiProperty() text!: string;
  @ApiProperty() type!: string;
  @ApiPropertyOptional({ nullable: true }) confidenceScore!: number | null;
  @ApiProperty({ type: [AcceptanceCriterionDto] }) acceptanceCriteria!: AcceptanceCriterionDto[];
}
