import { Module } from '@nestjs/common';
import { IntegrationController } from './presentation/integration.controller';
import { IntegrationsController } from './presentation/integrations.controller';
import { InternalIntegrationsController } from './presentation/internal-integrations.controller';

import { INTEGRATION_COMMAND_HANDLERS } from './application/commands';
import { INTEGRATION_QUERY_HANDLERS } from './application/queries';
import { CREDENTIAL_VAULT } from './application/ports/credential-vault.port';
import { INTEGRATION_CONNECTORS } from './application/ports/integration-connector.port';
import { INTEGRATION_CONNECTION_REPOSITORY } from './domain/repositories/integration-connection.repository.interface';

import { AesCredentialVaultService } from './infrastructure/services/aes-credential-vault.service';
import { AuditLogService } from './infrastructure/services/audit-log.service';
import { JiraConnectorService } from './infrastructure/connectors/jira-connector.service';
import { PrismaIntegrationConnectionRepository } from './infrastructure/repositories/prisma-integration-connection.repository';

// Bounded context module: Integration Hub (Solution Architecture §6/§18).
// Layering: presentation -> application -> domain <- infrastructure (Solution Architecture §7).
// Jira is the reference connector implementation; Linear and others register the same way --
// implement IIntegrationConnector, add to the INTEGRATION_CONNECTORS factory below.
@Module({
  controllers: [IntegrationController, IntegrationsController, InternalIntegrationsController],
  providers: [
    ...INTEGRATION_COMMAND_HANDLERS,
    ...INTEGRATION_QUERY_HANDLERS,
    JiraConnectorService,
    AuditLogService,
    { provide: CREDENTIAL_VAULT, useClass: AesCredentialVaultService },
    { provide: INTEGRATION_CONNECTION_REPOSITORY, useClass: PrismaIntegrationConnectionRepository },
    {
      provide: INTEGRATION_CONNECTORS,
      useFactory: (jira: JiraConnectorService) => [jira],
      inject: [JiraConnectorService],
    },
  ],
  // AuditLogService exported for ba-review's approve/admin-unlock commands to reuse directly
  // (same "shared provider" precedent as AiModule exporting AGENT_REPOSITORY) instead of
  // duplicating audit-log-writing code in a second module.
  exports: [AuditLogService],
})
export class IntegrationModule {}
