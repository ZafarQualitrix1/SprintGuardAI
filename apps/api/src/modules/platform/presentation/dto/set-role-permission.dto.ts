import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetRolePermissionDto {
  @ApiProperty()
  @IsBoolean()
  granted!: boolean;
}
