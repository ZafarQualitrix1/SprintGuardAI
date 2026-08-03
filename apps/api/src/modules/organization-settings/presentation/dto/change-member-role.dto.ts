import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ChangeMemberRoleDto {
  @ApiProperty({ example: 'QA_LEAD' })
  @IsString()
  roleKey!: string;
}
