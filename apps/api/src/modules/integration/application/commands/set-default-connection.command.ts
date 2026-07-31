import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  INTEGRATION_CONNECTION_REPOSITORY,
  IIntegrationConnectionRepository,
} from '../../domain/repositories/integration-connection.repository.interface';
import { AuditLogService } from '../../infrastructure/services/audit-log.service';
import { IntegrationConnectionEntity } from '../../domain/entities/integration-connection.entity';

export class SetDefaultConnectionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly connectionId: string,
  ) {}
}

@CommandHandler(SetDefaultConnectionCommand)
export class SetDefaultConnectionHandler
  implements ICommandHandler<SetDefaultConnectionCommand, IntegrationConnectionEntity>
{
  constructor(
    @Inject(INTEGRATION_CONNECTION_REPOSITORY)
    private readonly connectionRepository: IIntegrationConnectionRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  async execute(command: SetDefaultConnectionCommand): Promise<IntegrationConnectionEntity> {
    const connection = await this.connectionRepository.setDefault(command.connectionId, command.organizationId);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      'integration.default_changed',
      'IntegrationConnection',
      connection.id,
    );

    return connection;
  }
}
