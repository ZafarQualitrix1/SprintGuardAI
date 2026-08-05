import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { TriggerAutomationExecutionCommand } from '../application/commands/trigger-automation-execution.command';
import { CancelAutomationExecutionCommand } from '../application/commands/cancel-automation-execution.command';
import { GetAutomationExecutionRunQuery } from '../application/queries/get-automation-execution-run.query';
import { ListAutomationExecutionRunsByStoryQuery } from '../application/queries/list-automation-execution-runs-by-story.query';
import { AutomationExecutionRunEntity } from '../domain/entities/automation-execution-run.entity';
import { ExecutionReportService } from '../application/services/execution-report.service';
import { AutomationExecutionRunDto, TriggerAutomationExecutionDto } from './dto';
import { toAutomationExecutionRunDto } from './automation-execution.presenter';

type ReportFormat = 'excel' | 'extent' | 'junit';
const REPORT_FORMATS: ReportFormat[] = ['excel', 'extent', 'junit'];

@ApiTags('Automation Execution')
@Controller('stories/:storyId/automation-execution')
export class StoryAutomationExecutionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('run')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('automation:write')
  async run(
    @Param('storyId') storyId: string,
    @Body() dto: TriggerAutomationExecutionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AutomationExecutionRunDto> {
    const run = await this.commandBus.execute<TriggerAutomationExecutionCommand, AutomationExecutionRunEntity>(
      new TriggerAutomationExecutionCommand(
        user.organizationId,
        storyId,
        dto.automationGenerationId,
        dto.environment,
        dto.browser ?? null,
        dto.tags ?? [],
        dto.parallelWorkers ?? 1,
        user.userId,
      ),
    );
    return toAutomationExecutionRunDto(run);
  }

  @Get('runs')
  @RequirePermission('automation:read')
  async runs(@Param('storyId') storyId: string): Promise<AutomationExecutionRunDto[]> {
    const runs = await this.queryBus.execute<ListAutomationExecutionRunsByStoryQuery, AutomationExecutionRunEntity[]>(
      new ListAutomationExecutionRunsByStoryQuery(storyId),
    );
    return runs.map(toAutomationExecutionRunDto);
  }
}

@ApiTags('Automation Execution')
@Controller('automation-execution')
export class AutomationExecutionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly reportService: ExecutionReportService,
  ) {}

  @Get(':id')
  @RequirePermission('automation:read')
  async detail(@Param('id') id: string): Promise<AutomationExecutionRunDto> {
    const run = await this.queryBus.execute<GetAutomationExecutionRunQuery, AutomationExecutionRunEntity>(
      new GetAutomationExecutionRunQuery(id),
    );
    return toAutomationExecutionRunDto(run);
  }

  // HTML (the GitHub Actions artifact, via reportArtifactUrl) and JSON (the run's own detail
  // response above) need no dedicated route -- only these three formats are actually generated
  // server-side, from data already persisted on the run row (see ExecutionReportService's doc
  // comment for why this doesn't re-parse Playwright's native report output).
  @Get(':id/report')
  @RequirePermission('automation:read')
  async report(
    @Param('id') id: string,
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Buffer | string> {
    if (!REPORT_FORMATS.includes(format as ReportFormat)) {
      throw new BadRequestException(`format must be one of: ${REPORT_FORMATS.join(', ')}`);
    }
    const run = await this.queryBus.execute<GetAutomationExecutionRunQuery, AutomationExecutionRunEntity>(
      new GetAutomationExecutionRunQuery(id),
    );

    if (format === 'excel') {
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="automation-report-${run.id}.xlsx"`,
      });
      return this.reportService.buildExcelWorkbook(run);
    }
    if (format === 'extent') {
      res.set({
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="automation-report-${run.id}.html"`,
      });
      return this.reportService.buildExtentStyleHtmlReport(run);
    }
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="automation-report-${run.id}.xml"`,
    });
    return this.reportService.buildJunitXml(run);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('automation:write')
  async cancel(@Param('id') id: string): Promise<AutomationExecutionRunDto> {
    const run = await this.commandBus.execute<CancelAutomationExecutionCommand, AutomationExecutionRunEntity>(
      new CancelAutomationExecutionCommand(id),
    );
    return toAutomationExecutionRunDto(run);
  }
}
