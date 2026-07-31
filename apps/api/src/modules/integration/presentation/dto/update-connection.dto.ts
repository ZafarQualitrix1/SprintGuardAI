import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateConnectionDto {
  @ApiPropertyOptional({ example: 'Acme Jira' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: 'https://acme.atlassian.net' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  siteUrl?: string;

  @ApiPropertyOptional({ example: 'jane@acme.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Leave blank to keep the current token' })
  @IsOptional()
  @IsString()
  @MinLength(10)
  apiToken?: string;

  @ApiPropertyOptional({ description: 'Set as the default workspace; unchecking has no effect' })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
