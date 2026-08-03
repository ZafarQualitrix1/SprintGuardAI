import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';

// Base64 encodes to ~4/3 the original byte size; 2MB (the enforced max) becomes ~2.8MB of text,
// so the length cap here is generous headroom, not the real limit -- UploadOrganizationLogoHandler
// enforces the actual 2MB ceiling against the decoded byte length.
const MAX_BASE64_LENGTH = 3 * 1024 * 1024;

export class UploadOrganizationLogoDto {
  @ApiProperty({ enum: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'] })
  @IsIn(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
  contentType!: string;

  @ApiProperty({ description: 'Base64-encoded file contents (no data: URL prefix).' })
  @IsString()
  @MaxLength(MAX_BASE64_LENGTH, { message: 'File is too large. Logos must be 2MB or smaller.' })
  data!: string;
}
