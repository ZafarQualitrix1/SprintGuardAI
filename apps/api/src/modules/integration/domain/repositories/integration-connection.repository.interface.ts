import { IntegrationConnectionEntity } from '../entities/integration-connection.entity';

export const INTEGRATION_CONNECTION_REPOSITORY = Symbol('IIntegrationConnectionRepository');

export interface CreateIntegrationConnectionInput {
  organizationId: string;
  connectorKey: string;
  name: string;
  credentialsEncrypted: string;
  config: Record<string, unknown>;
}

export interface IIntegrationConnectionRepository {
  create(input: CreateIntegrationConnectionInput): Promise<IntegrationConnectionEntity>;
  findById(id: string, organizationId: string): Promise<IntegrationConnectionEntity | null>;
  findCredentialsById(
    id: string,
    organizationId: string,
  ): Promise<{ credentialsEncrypted: string; config: Record<string, unknown>; connectorKey: string } | null>;
  listByOrganization(organizationId: string): Promise<IntegrationConnectionEntity[]>;
}
