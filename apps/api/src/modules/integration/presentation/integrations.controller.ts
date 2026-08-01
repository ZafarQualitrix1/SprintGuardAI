import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ConnectJiraCommand } from '../application/commands/connect-jira.command';
import { UpdateConnectionCommand } from '../application/commands/update-connection.command';
import { DisconnectConnectionCommand } from '../application/commands/disconnect-connection.command';
import { DeleteConnectionCommand } from '../application/commands/delete-connection.command';
import { SetDefaultConnectionCommand } from '../application/commands/set-default-connection.command';
import { TestConnectionCommand, TestConnectionResult } from '../application/commands/test-connection.command';
import { SyncConnectionCommand, SyncConnectionResult } from '../application/commands/sync-connection.command';
import {
  VerifyJiraCredentialsCommand,
  VerifyCredentialsResult,
} from '../application/commands/verify-jira-credentials.command';
import { ListIntegrationConnectionsQuery } from '../application/queries/list-integration-connections.query';
import { FetchExternalProjectsQuery } from '../application/queries/fetch-external-projects.query';
import { FetchExternalBoardsQuery } from '../application/queries/fetch-external-boards.query';
import { FetchExternalActiveSprintsQuery } from '../application/queries/fetch-external-active-sprints.query';
import { IntegrationConnectionEntity } from '../domain/entities/integration-connection.entity';
import {
  ExternalActiveSprintPayload,
  ExternalBoardPayload,
  ExternalProjectPayload,
} from '../application/ports/integration-connector.port';
import { IntegrationConnectionDto } from './dto/integration-connection.dto';
import { ConnectJiraDto } from './dto/connect-jira.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { VerifyJiraCredentialsDto } from './dto/verify-jira-credentials.dto';

function toDto(entity: IntegrationConnectionEntity): IntegrationConnectionDto {
  return {
    id: entity.id,
    connectorKey: entity.connectorKey,
    name: entity.name,
    siteUrl: entity.siteUrl,
    email: entity.email,
    status: entity.status,
    isDefault: entity.isDefault,
    healthStatus: entity.healthStatus,
    lastHealthCheckAt: entity.lastHealthCheckAt?.toISOString() ?? null,
    lastSyncedAt: entity.lastSyncedAt?.toISOString() ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
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
      new ConnectJiraCommand(
        user.organizationId,
        user.userId,
        dto.name,
        dto.siteUrl,
        dto.email,
        dto.apiToken,
        dto.isDefault ?? false,
      ),
    );
    return toDto(connection);
  }

  @Post('jira/verify')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('integration:manage')
  async verifyJira(@Body() dto: VerifyJiraCredentialsDto): Promise<VerifyCredentialsResult> {
    return this.commandBus.execute<VerifyJiraCredentialsCommand, VerifyCredentialsResult>(
      new VerifyJiraCredentialsCommand(dto.siteUrl, dto.email, dto.apiToken),
    );
  }

  @Patch(':id')
  @RequirePermission('integration:manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConnectionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IntegrationConnectionDto> {
    const connection = await this.commandBus.execute<UpdateConnectionCommand, IntegrationConnectionEntity>(
      new UpdateConnectionCommand(
        user.organizationId,
        user.userId,
        id,
        dto.name,
        dto.siteUrl,
        dto.email,
        dto.apiToken,
        dto.isDefault,
      ),
    );
    return toDto(connection);
  }

  @Post(':id/disconnect')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('integration:manage')
  async disconnect(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IntegrationConnectionDto> {
    const connection = await this.commandBus.execute<DisconnectConnectionCommand, IntegrationConnectionEntity>(
      new DisconnectConnectionCommand(user.organizationId, user.userId, id),
    );
    return toDto(connection);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('integration:manage')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.commandBus.execute<DeleteConnectionCommand, void>(
      new DeleteConnectionCommand(user.organizationId, user.userId, id),
    );
  }

  @Post(':id/set-default')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('integration:manage')
  async setDefault(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<IntegrationConnectionDto> {
    const connection = await this.commandBus.execute<SetDefaultConnectionCommand, IntegrationConnectionEntity>(
      new SetDefaultConnectionCommand(user.organizationId, user.userId, id),
    );
    return toDto(connection);
  }

  @Post(':id/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('integration:manage')
  async test(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<TestConnectionResult> {
    return this.commandBus.execute<TestConnectionCommand, TestConnectionResult>(
      new TestConnectionCommand(user.organizationId, id),
    );
  }

  @Post(':id/sync')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('integration:manage')
  async sync(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<SyncConnectionResult> {
    return this.commandBus.execute<SyncConnectionCommand, SyncConnectionResult>(
      new SyncConnectionCommand(user.organizationId, id),
    );
  }

  @Get(':id/projects')
  @RequirePermission('integration:manage')
  async projects(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExternalProjectPayload[]> {
    return this.queryBus.execute<FetchExternalProjectsQuery, ExternalProjectPayload[]>(
      new FetchExternalProjectsQuery(user.organizationId, id),
    );
  }

  @Get(':id/boards')
  @RequirePermission('integration:manage')
  async boards(
    @Param('id') id: string,
    @Query('projectKey') projectKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExternalBoardPayload[]> {
    return this.queryBus.execute<FetchExternalBoardsQuery, ExternalBoardPayload[]>(
      new FetchExternalBoardsQuery(user.organizationId, id, projectKey),
    );
  }

  @Get(':id/sprints')
  @RequirePermission('integration:manage')
  async sprints(
    @Param('id') id: string,
    @Query('boardId') boardId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExternalActiveSprintPayload[]> {
    return this.queryBus.execute<FetchExternalActiveSprintsQuery, ExternalActiveSprintPayload[]>(
      new FetchExternalActiveSprintsQuery(user.organizationId, id, boardId),
    );
  }
}
