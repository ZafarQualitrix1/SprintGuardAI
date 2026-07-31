import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { INTEGRATION_CONNECTORS, IIntegrationConnector } from '../ports/integration-connector.port';

export interface TestConnectionResult {
  healthStatus: 'HEALTHY' | 'UNHEALTHY';
  lastHealthCheckAt: Date;
  error?: string;
}

// Diagnostic action, not a must-succeed one -- returns a result rather than throwing, since a
// failed health check is an expected, displayable outcome (used by both the manual "Test
// Connection" card action and the internal health-check sweep), not a request failure.
export class TestConnectionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
  ) {}
}

@CommandHandler(TestConnectionCommand)
export class TestConnectionHandler implements ICommandHandler<TestConnectionCommand, TestConnectionResult> {
  private readonly logger = new Logger(TestConnectionHandler.name);

  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(command: TestConnectionCommand): Promise<TestConnectionResult> {
    const connection = await this.connectionRepository.findCredentialsById(
      command.connectionId,
      command.organizationId,
    );
    if (!connection) {
      throw new NotFoundException('Integration connection not found');
    }

    const connector = this.connectors.find((c) => c.key === connection.connectorKey);
    if (!connector) {
      throw new NotFoundException(`No connector registered for "${connection.connectorKey}"`);
    }

    const now = new Date();
    try {
      const credentials = JSON.parse(this.credentialVault.decrypt(connection.credentialsEncrypted));
      await connector.verifyCredentials(credentials, connection.config);
      await this.connectionRepository.updateHealth(command.connectionId, 'HEALTHY', now, 'CONNECTED');
      return { healthStatus: 'HEALTHY', lastHealthCheckAt: now };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Health check failed';
      this.logger.warn(`Health check failed for connection ${command.connectionId}: ${message}`);
      await this.connectionRepository.updateHealth(command.connectionId, 'UNHEALTHY', now, 'ERROR');
      return { healthStatus: 'UNHEALTHY', lastHealthCheckAt: now, error: message };
    }
  }
}
