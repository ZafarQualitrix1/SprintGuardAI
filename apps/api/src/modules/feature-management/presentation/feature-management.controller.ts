import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ListFeatureFlagsQuery } from '../application/queries/list-feature-flags.query';
import { SetFeatureFlagCommand } from '../application/commands/set-feature-flag.command';
import { SetFeatureFlagOverrideCommand } from '../application/commands/set-feature-flag-override.command';
import { RemoveFeatureFlagOverrideCommand } from '../application/commands/remove-feature-flag-override.command';
import { FeatureFlagRecord } from '../domain/repositories/feature-flag.repository.interface';
import { SetFeatureFlagDto, SetFeatureFlagOverrideDto } from './dto/set-feature-flag.dto';

// Presentation layer: HTTP entrypoints only. Delegates to Application-layer command/query
// handlers -- never touches Domain or Infrastructure directly. Backs Admin Console's "Feature
// Flags" tab. Global (`isEnabled`/`description`) requires `admin:platform`; per-org overrides
// require the narrower `feature-flags:manage`.
@ApiTags('FeatureManagement')
@Controller('feature-flags')
export class FeatureManagementController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('feature-flags:manage')
  async list(): Promise<FeatureFlagRecord[]> {
    return this.queryBus.execute(new ListFeatureFlagsQuery());
  }

  @Patch(':key')
  @RequirePermission('admin:platform')
  async setGlobal(
    @Param('key') key: string,
    @Body() dto: SetFeatureFlagDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FeatureFlagRecord> {
    return this.commandBus.execute(
      new SetFeatureFlagCommand(user.organizationId, user.userId, key, dto.isEnabled, dto.description),
    );
  }

  @Post(':key/overrides')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('feature-flags:manage')
  async setOverride(
    @Param('key') key: string,
    @Body() dto: SetFeatureFlagOverrideDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FeatureFlagRecord> {
    return this.commandBus.execute(
      new SetFeatureFlagOverrideCommand(user.organizationId, user.userId, key, dto.isEnabled, dto.rolloutPercentage),
    );
  }

  @Delete(':key/overrides')
  @RequirePermission('feature-flags:manage')
  async removeOverride(
    @Param('key') key: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FeatureFlagRecord> {
    return this.commandBus.execute(new RemoveFeatureFlagOverrideCommand(user.organizationId, user.userId, key));
  }
}
