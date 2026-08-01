import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  AGENT_MANAGEMENT_REPOSITORY,
  IAgentManagementRepository,
} from '../../domain/repositories/agent-management.repository.interface';
import { AgentsAuditLogService } from '../../infrastructure/services/agents-audit-log.service';

export interface SetAgentStatusResult {
  id: string;
  key: string;
  status: string;
}

export class SetAgentStatusCommand {
  constructor(
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly agentKey: string,
    public readonly status: 'ENABLED' | 'DISABLED',
  ) {}
}

@CommandHandler(SetAgentStatusCommand)
export class SetAgentStatusHandler implements ICommandHandler<SetAgentStatusCommand, SetAgentStatusResult> {
  constructor(
    @Inject(AGENT_MANAGEMENT_REPOSITORY) private readonly repository: IAgentManagementRepository,
    private readonly auditLog: AgentsAuditLogService,
  ) {}

  async execute(command: SetAgentStatusCommand): Promise<SetAgentStatusResult> {
    const result = await this.repository.setStatus(command.agentKey, command.status);

    await this.auditLog.record(
      command.organizationId,
      command.actorId,
      command.status === 'ENABLED' ? 'agent.enabled' : 'agent.disabled',
      'Agent',
      result.id,
    );

    return result;
  }
}
