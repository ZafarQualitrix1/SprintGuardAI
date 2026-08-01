import { Body, Controller, Param, Post, Get, Patch, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { UpsertAiProviderConfigCommand } from '../application/commands/upsert-ai-provider-config.command';
import { SetProviderEnabledCommand } from '../application/commands/set-provider-enabled.command';
import { SetDefaultProviderCommand } from '../application/commands/set-default-provider.command';
import {
  TestAiProviderConnectionCommand,
  TestAiProviderConnectionResult,
} from '../application/commands/test-ai-provider-connection.command';
import { UpsertModuleAiConfigCommand } from '../application/commands/upsert-module-ai-config.command';
import { ListAiProvidersQuery, AiProviderSummary } from '../application/queries/list-ai-providers.query';
import { ListAiModelsQuery, AiModelSummary } from '../application/queries/list-ai-models.query';
import { ListModuleAiConfigsQuery, ModuleAiConfigSummary } from '../application/queries/list-module-ai-configs.query';
import { AiProviderConfigRecord } from '../domain/repositories/ai-provider-config.repository.interface';
import { ModuleAiConfigRecord } from '../domain/repositories/module-ai-config.repository.interface';
import { UpsertAiProviderConfigDto } from './dto/upsert-ai-provider-config.dto';
import { UpsertModuleAiConfigDto } from './dto/upsert-module-ai-config.dto';

// Presentation layer: HTTP entrypoints only. Delegates to Application-layer command/query
// handlers -- never touches Domain or Infrastructure directly (Solution Architecture §7). This is
// the AI Settings Control Center's provider/model/module-config surface; usage/cost/logs live in
// the AiOps module and agent enable/disable/stats live in the Agents module (Solution
// Architecture §6 bounded contexts already scaffolded for those concerns).
@ApiTags('Ai')
@Controller('ai')
export class AiController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('providers')
  @RequirePermission('ai-settings:manage')
  async listProviders(@CurrentUser() user: AuthenticatedUser): Promise<AiProviderSummary[]> {
    return this.queryBus.execute(new ListAiProvidersQuery(user.organizationId));
  }

  @Patch('providers/:provider')
  @RequirePermission('ai-settings:manage')
  async upsertProviderConfig(
    @Param('provider') provider: string,
    @Body() dto: UpsertAiProviderConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiProviderConfigRecord> {
    return this.commandBus.execute(
      new UpsertAiProviderConfigCommand(user.organizationId, user.userId, provider, dto),
    );
  }

  @Post('providers/:provider/enable')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('ai-settings:manage')
  async enableProvider(
    @Param('provider') provider: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiProviderConfigRecord> {
    return this.commandBus.execute(new SetProviderEnabledCommand(user.organizationId, user.userId, provider, true));
  }

  @Post('providers/:provider/disable')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('ai-settings:manage')
  async disableProvider(
    @Param('provider') provider: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiProviderConfigRecord> {
    return this.commandBus.execute(new SetProviderEnabledCommand(user.organizationId, user.userId, provider, false));
  }

  @Post('providers/:provider/set-default')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('ai-settings:manage')
  async setDefaultProvider(
    @Param('provider') provider: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AiProviderConfigRecord> {
    return this.commandBus.execute(new SetDefaultProviderCommand(user.organizationId, user.userId, provider));
  }

  @Post('providers/:provider/test')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('ai-settings:manage')
  async testProviderConnection(
    @Param('provider') provider: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TestAiProviderConnectionResult> {
    return this.commandBus.execute(new TestAiProviderConnectionCommand(user.organizationId, provider));
  }

  @Get('models')
  @RequirePermission('ai-settings:manage')
  async listModels(): Promise<AiModelSummary[]> {
    return this.queryBus.execute(new ListAiModelsQuery());
  }

  @Get('modules')
  @RequirePermission('ai-settings:manage')
  async listModuleConfigs(@CurrentUser() user: AuthenticatedUser): Promise<ModuleAiConfigSummary[]> {
    return this.queryBus.execute(new ListModuleAiConfigsQuery(user.organizationId));
  }

  @Patch('modules/:capability')
  @RequirePermission('ai-settings:manage')
  async upsertModuleConfig(
    @Param('capability') capability: string,
    @Body() dto: UpsertModuleAiConfigDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ModuleAiConfigRecord> {
    return this.commandBus.execute(
      new UpsertModuleAiConfigCommand(user.organizationId, user.userId, capability, dto),
    );
  }
}
