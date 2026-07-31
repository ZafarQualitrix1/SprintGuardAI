import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUrl, MinLength } from 'class-validator';

// Backs the add-connection dialog's pre-save "Test Connection" button -- nothing persisted.
export class VerifyJiraCredentialsDto {
  @ApiProperty({ example: 'https://acme.atlassian.net' })
  @IsUrl({ require_protocol: true })
  siteUrl!: string;

  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  apiToken!: string;
}

export class VerifyCredentialsResultDto {
  @ApiProperty() healthy!: boolean;
  @ApiProperty({ required: false }) error?: string;
}
