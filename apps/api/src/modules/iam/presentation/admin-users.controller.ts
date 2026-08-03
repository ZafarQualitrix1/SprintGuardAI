import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ListUsersQuery, AdminUserSummary } from '../application/queries/list-users.query';
import { UpdateUserCommand } from '../application/commands/update-user.command';
import { SetUserActiveCommand } from '../application/commands/suspend-user.command';
import { ResetUserPasswordCommand, ResetUserPasswordResult } from '../application/commands/reset-user-password.command';
import { ForceLogoutUserCommand } from '../application/commands/force-logout-user.command';
import { DeleteUserCommand } from '../application/commands/delete-user.command';
import { UpdateUserDto } from './dto/update-user.dto';

// Presentation layer: HTTP entrypoints only. Delegates to Application-layer command/query
// handlers -- never touches Domain or Infrastructure directly. Backs Admin Console's "User
// Administration" section. Scoped to the caller's own organization (ADMIN/PLATFORM_ADMIN both
// already carry org:manage per the seeded role catalog) -- cross-org user management for
// platform admins is a follow-up once an org-picker UI exists.
@ApiTags('AdminUsers')
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('org:manage')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('roleKey') roleKey?: string,
    @Query('isActive') isActive?: string,
  ): Promise<AdminUserSummary[]> {
    return this.queryBus.execute(
      new ListUsersQuery(user.organizationId, {
        search,
        roleKey,
        isActive: isActive === undefined ? undefined : isActive === 'true',
      }),
    );
  }

  @Patch(':id')
  @RequirePermission('org:manage')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; fullName: string }> {
    return this.commandBus.execute(new UpdateUserCommand(user.organizationId, user.userId, id, dto));
  }

  @Post(':id/suspend')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:manage')
  async suspend(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; isActive: boolean }> {
    return this.commandBus.execute(new SetUserActiveCommand(user.organizationId, user.userId, id, false));
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:manage')
  async activate(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ id: string; isActive: boolean }> {
    return this.commandBus.execute(new SetUserActiveCommand(user.organizationId, user.userId, id, true));
  }

  @Post(':id/reset-password')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:manage')
  async resetPassword(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResetUserPasswordResult> {
    return this.commandBus.execute(new ResetUserPasswordCommand(user.organizationId, user.userId, id));
  }

  @Post(':id/force-logout')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:manage')
  async forceLogout(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.commandBus.execute(new ForceLogoutUserCommand(user.organizationId, user.userId, id));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('org:manage')
  async remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.commandBus.execute(new DeleteUserCommand(user.organizationId, user.userId, id));
  }
}
