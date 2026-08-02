import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ArchiveSprintDto {
  @ApiProperty()
  @IsBoolean()
  archived!: boolean;
}
