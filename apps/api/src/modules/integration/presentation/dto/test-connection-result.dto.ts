import { ApiProperty } from '@nestjs/swagger';

export class TestConnectionResultDto {
  @ApiProperty({ enum: ['HEALTHY', 'UNHEALTHY'] }) healthStatus!: string;
  @ApiProperty() lastHealthCheckAt!: string;
  @ApiProperty({ required: false }) error?: string;
}

export class SyncConnectionResultDto {
  @ApiProperty() lastSyncedAt!: string;
  @ApiProperty() projectCount!: number;
}
