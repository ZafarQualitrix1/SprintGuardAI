export type ConnectionStatus = 'PENDING' | 'CONNECTED' | 'ERROR' | 'DISCONNECTED';

// Plain-TypeScript Domain entity (Solution Architecture §7/§18). Never carries the decrypted
// credential -- that only ever exists transiently inside a connector call, never on this entity.
export class IntegrationConnectionEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly connectorKey: string,
    public readonly name: string,
    public readonly status: ConnectionStatus,
    public readonly config: Record<string, unknown>,
  ) {}
}
