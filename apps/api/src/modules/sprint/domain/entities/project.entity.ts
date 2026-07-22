export class ProjectEntity {
  constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly key: string,
    public readonly name: string,
    public readonly description: string | null,
  ) {}
}
