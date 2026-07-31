// Cache of a Jira (or future connector) project visible to a connection -- never the system of
// record for imported sprint data (see IntegrationProject model comment in schema.prisma).
export class IntegrationProjectEntity {
  constructor(
    public readonly id: string,
    public readonly connectionId: string,
    public readonly externalKey: string,
    public readonly name: string,
    public readonly avatarUrl: string | null,
    public readonly lead: string | null,
    public readonly isArchived: boolean,
    public readonly updatedAt: Date,
  ) {}
}
