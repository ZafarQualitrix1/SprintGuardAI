export type ConnectionStatus = 'PENDING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED';
export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'UNKNOWN';

// Plain-TypeScript Domain entity (Solution Architecture §7/§18). Never carries the decrypted
// credential -- that only ever exists transiently inside a connector call, never on this entity.
export class IntegrationConnectionEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly connectorKey: string,
    public readonly name: string,
    public readonly siteUrl: string,
    public readonly email: string | null,
    public readonly status: ConnectionStatus,
    public readonly isDefault: boolean,
    public readonly healthStatus: HealthStatus,
    public readonly lastHealthCheckAt: Date | null,
    public readonly lastSyncedAt: Date | null,
    public readonly config: Record<string, unknown>,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}
