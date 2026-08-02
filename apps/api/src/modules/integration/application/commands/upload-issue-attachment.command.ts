import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import { IIntegrationConnector, INTEGRATION_CONNECTORS } from '../ports/integration-connector.port';

export class UploadIssueAttachmentCommand {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
    public readonly externalId: string,
    public readonly file: { filename: string; contentType: string; buffer: Buffer },
  ) {}
}

@CommandHandler(UploadIssueAttachmentCommand)
export class UploadIssueAttachmentHandler
  implements ICommandHandler<UploadIssueAttachmentCommand, { attachmentId: string }>
{
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(command: UploadIssueAttachmentCommand): Promise<{ attachmentId: string }> {
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

    const credentials = JSON.parse(this.credentialVault.decrypt(connection.credentialsEncrypted));
    return connector.uploadAttachment(command.externalId, command.file, credentials, connection.config);
  }
}
