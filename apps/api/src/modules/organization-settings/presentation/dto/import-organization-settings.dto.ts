import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

export class ImportOrganizationSettingsDto {
  @ApiProperty({ description: 'The "settings" object from a previously exported backup JSON file' })
  @IsOptional()
  @IsObject()
  settings?: Record<string, unknown>;
}
