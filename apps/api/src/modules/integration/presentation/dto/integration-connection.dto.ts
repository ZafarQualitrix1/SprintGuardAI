import { ApiProperty } from '@nestjs/swagger';

export class IntegrationConnectionDto {
  @ApiProperty() id!: string;
  @ApiProperty() connectorKey!: string;
  @ApiProperty() name!: string;
  @ApiProperty() status!: string;
}
