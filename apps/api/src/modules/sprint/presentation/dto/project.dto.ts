import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProjectDto {
  @ApiProperty() id!: string;
  @ApiProperty() key!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
}
