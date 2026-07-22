// A user's role within one organization -- the resolved shape a request actually authorizes
// against (Solution Architecture §25 RBAC).
export class MembershipEntity {
  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly organizationName: string,
    public readonly roleKey: string,
    public readonly permissions: readonly string[],
  ) {}

  hasPermission(permission: string): boolean {
    return this.permissions.includes(permission);
  }
}
