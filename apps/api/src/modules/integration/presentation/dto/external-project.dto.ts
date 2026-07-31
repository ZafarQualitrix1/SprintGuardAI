import { ApiProperty } from '@nestjs/swagger';

// Import wizard step 2 response shape -- also the shape returned by "Open Projects".
export class ExternalProjectDto {
  @ApiProperty() externalKey!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true }) avatarUrl!: string | null;
  @ApiProperty({ nullable: true }) lead!: string | null;
}
