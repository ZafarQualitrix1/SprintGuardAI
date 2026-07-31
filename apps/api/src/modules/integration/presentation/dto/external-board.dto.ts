import { ApiProperty } from '@nestjs/swagger';

// Import wizard step 3 response shape.
export class ExternalBoardDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() type!: string;
}
