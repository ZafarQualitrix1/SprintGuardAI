import { HealthStatus, IntegrationConnectionEntity } from '../entities/integration-connection.entity';
import { IntegrationProjectEntity } from '../entities/integration-project.entity';
import { ExternalProjectPayload } from '../../application/ports/integration-connector.port';

export const INTEGRATION_CONNECTION_REPOSITORY = Symbol('IIntegrationConnectionRepository');

export interface CreateIntegrationConnectionInput {
  organizationId: string;
  connectorKey: string;
  name: string;
  siteUrl: string;
  email: string;
  credentialsEncrypted: string;
  config: Record<string, unknown>;
  isDefault: boolean;
}

export interface UpdateIntegrationConnectionInput {
  name?: string;
  siteUrl?: string;
  email?: string;
  credentialsEncrypted?: string;
  config?: Record<string, unknown>;
}

export interface IIntegrationConnectionRepository {
  create(input: CreateIntegrationConnectionInput): Promise<IntegrationConnectionEntity>;
  update(
    id: string,
    organizationId: string,
    patch: UpdateIntegrationConnectionInput,
  ): Promise<IntegrationConnectionEntity>;
  findById(id: string, organizationId: string): Promise<IntegrationConnectionEntity | null>;
  findCredentialsById(
    id: string,
    organizationId: string,
  ): Promise<{ credentialsEncrypted: string; config: Record<string, unknown>; connectorKey: string } | null>;
  listByOrganization(organizationId: string): Promise<IntegrationConnectionEntity[]>;
  /** Whether this org already has any connection for this connector -- drives "first connection auto-defaults". */
  hasAnyForConnector(organizationId: string, connectorKey: string): Promise<boolean>;
  /** Sets `id` as the default for its org+connector, clearing the previous default. */
  setDefault(id: string, organizationId: string): Promise<IntegrationConnectionEntity>;
  /** Soft-disconnect: status=DISCONNECTED, credentials tombstoned. Row (and any imported sprint data) stays. */
  softDisconnect(id: string, organizationId: string): Promise<IntegrationConnectionEntity>;
  /** Permanently deletes the connection row (cascades to its cached projects, webhook events and sync jobs). */
  hardDelete(id: string, organizationId: string): Promise<void>;
  updateHealth(
    id: string,
    healthStatus: HealthStatus,
    lastHealthCheckAt: Date,
    status?: 'CONNECTED' | 'ERROR',
  ): Promise<void>;
  updateSyncTimestamp(id: string, lastSyncedAt: Date): Promise<void>;
  /**
   * All CONNECTED connections across every organization -- the one intentionally cross-org query
   * in this repository, since every other method is org-scoped for tenant isolation. Only the
   * internal health-check sweep (not a user request) may call this.
   */
  listAllConnected(): Promise<IntegrationConnectionEntity[]>;
  upsertProjects(connectionId: string, projects: ExternalProjectPayload[]): Promise<IntegrationProjectEntity[]>;
  listProjectsByConnection(connectionId: string, organizationId: string): Promise<IntegrationProjectEntity[]>;
}
