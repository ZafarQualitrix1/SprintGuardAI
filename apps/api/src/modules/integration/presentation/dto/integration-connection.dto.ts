import { ApiProperty } from '@nestjs/swagger';

// Never includes credentialsEncrypted or the decrypted token -- decryption only ever happens
// server-side, transiently, inside a connector call.
export class IntegrationConnectionDto {
  @ApiProperty() id!: string;
  @ApiProperty() connectorKey!: string;
  @ApiProperty() name!: string;
  @ApiProperty() siteUrl!: string;
  @ApiProperty({ nullable: true }) email!: string | null;
  @ApiProperty() status!: string;
  @ApiProperty() isDefault!: boolean;
  @ApiProperty() healthStatus!: string;
  @ApiProperty({ nullable: true }) lastHealthCheckAt!: string | null;
  @ApiProperty({ nullable: true }) lastSyncedAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}
