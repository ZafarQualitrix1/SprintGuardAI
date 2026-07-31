import type { Connector, IntegrationConnection, IntegrationProject } from '@sprintguard/database';
import { IntegrationConnectionEntity } from '../../domain/entities/integration-connection.entity';
import { IntegrationProjectEntity } from '../../domain/entities/integration-project.entity';

type IntegrationConnectionWithConnector = IntegrationConnection & { connector: Connector };

export function toIntegrationConnectionEntity(
  row: IntegrationConnectionWithConnector,
): IntegrationConnectionEntity {
  return new IntegrationConnectionEntity(
    row.id,
    row.organizationId,
    row.connector.key,
    row.name,
    row.siteUrl,
    row.email,
    row.status,
    row.isDefault,
    row.healthStatus,
    row.lastHealthCheckAt,
    row.lastSyncedAt,
    (row.config as Record<string, unknown>) ?? {},
    row.createdAt,
    row.updatedAt,
  );
}

export function toIntegrationProjectEntity(row: IntegrationProject): IntegrationProjectEntity {
  return new IntegrationProjectEntity(
    row.id,
    row.connectionId,
    row.externalKey,
    row.name,
    row.avatarUrl,
    row.lead,
    row.isArchived,
    row.updatedAt,
  );
}
