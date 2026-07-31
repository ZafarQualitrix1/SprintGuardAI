import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class ConnectJiraDto {
  @ApiProperty({ example: 'Acme Jira' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty({ example: 'https://acme.atlassian.net' })
  @IsUrl({ require_protocol: true })
  siteUrl!: string;

  @ApiProperty({ example: 'jane@acme.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Atlassian API token (id.atlassian.com/manage-profile/security/api-tokens)' })
  @IsString()
  @MinLength(10)
  apiToken!: string;

  @ApiPropertyOptional({ description: 'Make this the default workspace (always true for the first connection)' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
