import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SprintDto } from './sprint.dto';

export class ProjectDto {
  @ApiProperty() id!: string;
  @ApiProperty() key!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
}

export class ProjectWithSprintsDto extends ProjectDto {
  @ApiProperty({ type: [SprintDto] }) sprints!: SprintDto[];
}
