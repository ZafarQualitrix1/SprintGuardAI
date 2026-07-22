// Canonical, connector-agnostic shape the Transformation Layer (Solution Architecture §18) maps
// every external system into. The `sprint` module's ImportSprintFromIntegration command only ever
// deals with this shape -- it has no knowledge of Jira/Linear-specific fields.
export interface ExternalStoryPayload {
  externalId: string;
  title: string;
  description: string | null;
  storyPoints: number | null;
  status: string;
  priority: string | null;
  assignee: string | null;
}

export interface ExternalSprintPayload {
  externalId: string;
  name: string;
  goal: string | null;
  startDate: Date | null;
  endDate: Date | null;
  stories: ExternalStoryPayload[];
}

export interface ConnectorCredentials {
  [key: string]: string;
}

// Implemented once per external system (Jira first -- Solution Architecture §18's reference
// implementation -- Linear next, behind this same port). A "Connector Registry" in the
// architecture sense is, for this MVP scope, the simple key->instance map built in
// integration.module.ts rather than a separate persisted table.
export interface IIntegrationConnector {
  readonly key: string;
  /** Throws if the credentials/config cannot authenticate against the external system. */
  verifyCredentials(credentials: ConnectorCredentials, config: Record<string, unknown>): Promise<void>;
  /** `reference` is whatever a user pastes -- a full URL or a bare external sprint id. */
  fetchSprint(
    reference: string,
    credentials: ConnectorCredentials,
    config: Record<string, unknown>,
  ): Promise<ExternalSprintPayload>;
}

// Multi-provider injection token: integration.module.ts binds this to an array of every
// registered connector; FetchExternalSprintHandler builds a key->instance lookup from it. Adding
// a new connector (Linear, etc.) never requires touching the handler.
export const INTEGRATION_CONNECTORS = Symbol('IntegrationConnectors');
