import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { ListAuditLogsQuery } from '../application/queries/list-audit-logs.query';
import { ExportAuditLogsQuery } from '../application/queries/export-audit-logs.query';
import { ListAuditLogsResult } from '../domain/repositories/audit-log.repository.interface';

// Presentation layer: HTTP entrypoints only. Delegates to Application-layer query handlers --
// never touches Domain or Infrastructure directly. Backs Admin Console's "Audit Logs" tab.
// Platform admins (admin:platform) see every organization's log; org admins (audit:read only)
// are scoped to their own organization.
@ApiTags('Platform')
@Controller('audit-log')
export class PlatformController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission('audit:read')
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<ListAuditLogsResult> {
    const isPlatformAdmin = user.permissions.includes('admin:platform');
    return this.queryBus.execute(
      new ListAuditLogsQuery({
        organizationId: isPlatformAdmin ? undefined : user.organizationId,
        actorId,
        action,
        targetType,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        page: page ? Number(page) : undefined,
        pageSize: pageSize ? Number(pageSize) : undefined,
      }),
    );
  }

  @Get('export')
  @RequirePermission('audit:export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="audit-log.csv"')
  async export(
    @CurrentUser() user: AuthenticatedUser,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('targetType') targetType?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<string> {
    const isPlatformAdmin = user.permissions.includes('admin:platform');
    const csv = await this.queryBus.execute(
      new ExportAuditLogsQuery({
        organizationId: isPlatformAdmin ? undefined : user.organizationId,
        actorId,
        action,
        targetType,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
      }),
    );
    return csv;
  }
}
