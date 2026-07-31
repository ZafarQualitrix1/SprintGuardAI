import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { AuditLogService } from '../../infrastructure/services/audit-log.service';
import { IntegrationConnectionEntity } from '../../domain/entities/integration-connection.entity';

// Soft delete: status -> DISCONNECTED, credentials tombstoned, row kept. Any sprints already
// imported through this connection are untouched -- Sprint/Story rows never FK to
// IntegrationConnection, they only reference it transiently during the import call.
export class DisconnectConnectionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly connectionId: string,
  ) {}
}

@CommandHandler(DisconnectConnectionCommand)
export class DisconnectConnectionHandler
  implements ICommandHandler<DisconnectConnectionCommand, IntegrationConnectionEntity>
{
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(command: DisconnectConnectionCommand): Promise<IntegrationConnectionEntity> {
    const connection = await this.connectionRepository.softDisconnect(command.connectionId, command.organizationId);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'integration.disconnected',
      'IntegrationConnection',
      connection.id,
    );

    return connection;
  }
}
