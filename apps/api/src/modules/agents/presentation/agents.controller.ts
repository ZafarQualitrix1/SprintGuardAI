import { Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { SetAgentStatusCommand, SetAgentStatusResult } from '../application/commands/set-agent-status.command';
import { ListAgentsQuery } from '../application/queries/list-agents.query';
import { AgentSummary } from '../domain/repositories/agent-management.repository.interface';

// Presentation layer: HTTP entrypoints only. Delegates to Application-layer command/query
// handlers -- never touches Domain or Infrastructure directly. Backs the AI Settings "Agents" tab.
@ApiTags('Agents')
@Controller('agents')
export class AgentsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('ai-settings:manage')
  async list(@CurrentUser() user: AuthenticatedUser): Promise<AgentSummary[]> {
    return this.queryBus.execute(new ListAgentsQuery(user.organizationId));
  }

  @Post(':key/enable')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('ai-settings:manage')
  async enable(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser): Promise<SetAgentStatusResult> {
    return this.commandBus.execute(new SetAgentStatusCommand(user.organizationId, user.userId, key, 'ENABLED'));
  }

  @Post(':key/disable')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('ai-settings:manage')
  async disable(@Param('key') key: string, @CurrentUser() user: AuthenticatedUser): Promise<SetAgentStatusResult> {
    return this.commandBus.execute(new SetAgentStatusCommand(user.organizationId, user.userId, key, 'DISABLED'));
  }
}
