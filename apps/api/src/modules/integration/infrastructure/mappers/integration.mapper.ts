import type { Connector, IntegrationConnection } from '@sprintguard/database';
import { IntegrationConnectionEntity } from '../../domain/entities/integration-connection.entity';

type IntegrationConnectionWithConnector = IntegrationConnection & { connector: Connector };

export function toIntegrationConnectionEntity(
  row: IntegrationConnectionWithConnector,
): IntegrationConnectionEntity {
  return new IntegrationConnectionEntity(
    row.id,
    row.organizationId,
    row.connector.key,
    row.name,
    row.status,
    (row.config as Record<string, unknown>) ?? {},
  );
}
