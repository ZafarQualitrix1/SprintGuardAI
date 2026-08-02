import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { CREDENTIAL_VAULT, ICredentialVault } from '../ports/credential-vault.port';
import { IIntegrationConnector, INTEGRATION_CONNECTORS } from '../ports/integration-connector.port';

// Same cross-module boundary as FetchExternalIssueDetailQuery -- BA Review depends on this via
// CommandBus rather than importing `integration`'s infrastructure directly.
export class PostIssueCommentCommand {
  constructor(
    public readonly organizationId: string,
    public readonly connectionId: string,
    public readonly externalId: string,
    public readonly adfBody: unknown,
  ) {}
}

@CommandHandler(PostIssueCommentCommand)
export class PostIssueCommentHandler implements ICommandHandler<PostIssueCommentCommand, { commentId: string }> {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    @Inject(CREDENTIAL_VAULT) private readonly credentialVault: ICredentialVault,
    @Inject(INTEGRATION_CONNECTORS) private readonly connectors: IIntegrationConnector[],
  ) {}

  async execute(command: PostIssueCommentCommand): Promise<{ commentId: string }> {
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
    return connector.postComment(command.externalId, command.adfBody, credentials, connection.config);
  }
}
