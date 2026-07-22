import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SprintDto {
  @ApiProperty() id!: string;
  @ApiProperty() projectId!: string;
  @ApiPropertyOptional({ nullable: true }) externalId!: string | null;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) goal!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() source!: string;
  @ApiPropertyOptional({ nullable: true }) startDate!: string | null;
  @ApiPropertyOptional({ nullable: true }) endDate!: string | null;
}

export class StoryDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) externalId!: string | null;
  @ApiProperty() title!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiPropertyOptional({ nullable: true }) storyPoints!: number | null;
  @ApiProperty() status!: string;
  @ApiPropertyOptional({ nullable: true }) priority!: string | null;
  @ApiPropertyOptional({ nullable: true }) assignee!: string | null;
}

export class SprintDetailDto extends SprintDto {
  @ApiProperty({ type: [StoryDto] }) stories!: StoryDto[];
}
