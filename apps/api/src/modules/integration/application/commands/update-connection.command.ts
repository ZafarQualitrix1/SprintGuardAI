import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { INTEGRATION_CONNECTORS, IIntegrationConnector } from '../ports/integration-connector.port';
import { AuditLogService } from '../../infrastructure/services/audit-log.service';
import { IntegrationConnectionEntity } from '../../domain/entities/integration-connection.entity';

export class UpdateConnectionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly connectionId: string,
    public readonly name?: string,
    public readonly siteUrl?: string,
    public readonly email?: string,
    public readonly apiToken?: string,
    /** Only acts when true (sets this as default); unchecking has no effect -- some other
     *  connection stays default, matching "only one workspace can be marked as Default." */
    public readonly requestedDefault?: boolean,
  ) {}
}

@CommandHandler(UpdateConnectionCommand)
export class UpdateConnectionHandler implements ICommandHandler<UpdateConnectionCommand, IntegrationConnectionEntity> {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(command: UpdateConnectionCommand): Promise<IntegrationConnectionEntity> {
    const existing = await this.connectionRepository.findById(command.connectionId, command.organizationId);
    if (!existing) {
      throw new NotFoundException('Integration connection not found');
    }

    const siteUrl = command.siteUrl ? new URL(command.siteUrl).origin : undefined;
    const email = command.email ?? existing.email ?? undefined;

    let credentialsEncrypted: string | undefined;
    // Only re-verify (and re-encrypt) if the caller actually supplied a new token -- "leave blank
    // to keep current" per the update dialog's copy.
    if (command.apiToken) {
      const connector = this.connectors.find((c) => c.key === existing.connectorKey);
      if (!connector) {
        throw new NotFoundException(`No connector registered for "${existing.connectorKey}"`);
      }
      const config = { ...existing.config, siteUrl: siteUrl ?? existing.siteUrl };
      const credentials = { email: email ?? '', apiToken: command.apiToken };
      await connector.verifyCredentials(credentials, config);
      credentialsEncrypted = this.credentialVault.encrypt(JSON.stringify(credentials));
    }

    let updated = await this.connectionRepository.update(command.connectionId, command.organizationId, {
      name: command.name,
      siteUrl,
      email,
      credentialsEncrypted,
      config: siteUrl ? { ...existing.config, siteUrl } : undefined,
    });

    if (command.requestedDefault && !updated.isDefault) {
      updated = await this.connectionRepository.setDefault(updated.id, command.organizationId);
    }

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'integration.updated',
      'IntegrationConnection',
      updated.id,
      { name: existing.name, siteUrl: existing.siteUrl, email: existing.email },
      { name: updated.name, siteUrl: updated.siteUrl, email: updated.email },
    );

    return updated;
  }
}
