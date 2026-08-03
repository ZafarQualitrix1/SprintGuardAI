import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';

export class GenerateLogoUploadUrlDto {
  @ApiProperty({ enum: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] })
  @IsIn(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
  contentType!: string;

  @ApiProperty()
  @IsInt()
  @Min(1, { message: 'File is empty.' })
  @Max(2 * 1024 * 1024, { message: 'File is too large. Logos must be 2MB or smaller.' })
  sizeBytes!: number;

  @ApiProperty({ example: 'png' })
  @IsString()
  extension!: string;
}

export class ConfirmLogoUploadDto {
  @ApiProperty()
  @IsString()
  path!: string;
}
