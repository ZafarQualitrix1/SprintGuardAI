import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GoogleSignInDto {
  @ApiProperty({ description: 'Google Identity Services ID token' })
  @IsString()
  credential!: string;
}
