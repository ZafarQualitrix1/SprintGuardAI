import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ConnectJiraCommand } from '../application/commands/connect-jira.command';
import { ListIntegrationConnectionsQuery } from '../application/queries/list-integration-connections.query';
import { IntegrationConnectionEntity } from '../domain/entities/integration-connection.entity';
import { IntegrationConnectionDto } from './dto/integration-connection.dto';
import { ConnectJiraDto } from './dto/connect-jira.dto';

function toDto(entity: IntegrationConnectionEntity): IntegrationConnectionDto {
  return {
    id: entity.id,
    connectorKey: entity.connectorKey,
    name: entity.name,
    status: entity.status,
  };
}

@ApiTags('Integrations')
@Controller('integrations')
export class IntegrationsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('integration:manage')
  async list(@CurrentUser() user: AuthenticatedUser): Promise<IntegrationConnectionDto[]> {
    const connections = await this.queryBus.execute<
      ListIntegrationConnectionsQuery,
      IntegrationConnectionEntity[]
    >(new ListIntegrationConnectionsQuery(user.organizationId));
    return connections.map(toDto);
  }

  @Post('jira/connect')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('integration:manage')
  async connectJira(
    @Body() dto: ConnectJiraDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IntegrationConnectionDto> {
    const connection = await this.commandBus.execute<ConnectJiraCommand, IntegrationConnectionEntity>(
      new ConnectJiraCommand(user.organizationId, dto.name, dto.siteUrl, dto.email, dto.apiToken),
    );
    return toDto(connection);
  }
}
