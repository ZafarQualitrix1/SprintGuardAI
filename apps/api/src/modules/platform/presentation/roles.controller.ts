import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ListRolesQuery, RolesAndPermissions } from '../application/queries/list-roles.query';
import { SetRolePermissionCommand } from '../application/commands/set-role-permission.command';
import { SetRolePermissionDto } from './dto/set-role-permission.dto';

// Presentation layer: HTTP entrypoints only. Backs Admin Console's "Roles & Permissions" matrix.
@ApiTags('Platform')
@Controller('admin/roles')
export class RolesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @RequirePermission('admin:platform')
  async list(): Promise<RolesAndPermissions> {
    return this.queryBus.execute(new ListRolesQuery());
  }

  @Patch(':roleKey/permissions/:permissionKey')
  @RequirePermission('admin:platform')
  async setPermission(
    @Param('roleKey') roleKey: string,
    @Param('permissionKey') permissionKey: string,
    @Body() dto: SetRolePermissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ roleKey: string; permissions: string[] }> {
    return this.commandBus.execute(
      new SetRolePermissionCommand(user.organizationId, user.userId, roleKey, permissionKey, dto.granted),
    );
  }
}
