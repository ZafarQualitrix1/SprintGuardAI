import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { AuditLogService } from '../../infrastructure/services/audit-log.service';

// Hard delete: the IntegrationConnection row (and its cascading IntegrationProject cache,
// WebhookEvent and SyncJob history rows) is permanently removed. Unlike DisconnectConnectionCommand,
// this cannot be undone. Previously imported sprint data is untouched -- Sprint/Story rows never
// FK to IntegrationConnection.
export class DeleteConnectionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly connectionId: string,
  ) {}
}

@CommandHandler(DeleteConnectionCommand)
export class DeleteConnectionHandler implements ICommandHandler<DeleteConnectionCommand, void> {
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(command: DeleteConnectionCommand): Promise<void> {
    await this.connectionRepository.hardDelete(command.connectionId, command.organizationId);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'integration.deleted',
      'IntegrationConnection',
      command.connectionId,
    );
  }
}
