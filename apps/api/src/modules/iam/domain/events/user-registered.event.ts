// Domain event published when a new Organization + owning User is created (Solution Architecture
// §9.1). Consumed today only for audit logging; future phases (e.g. onboarding emails, workspace
// provisioning) subscribe to the same event without touching the command handler.
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly organizationId: string,
    public readonly email: string,
  ) {}
}
