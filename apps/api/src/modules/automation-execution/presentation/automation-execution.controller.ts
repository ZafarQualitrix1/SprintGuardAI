import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { TriggerAutomationExecutionCommand } from '../application/commands/trigger-automation-execution.command';
import { CancelAutomationExecutionCommand } from '../application/commands/cancel-automation-execution.command';
import { GetAutomationExecutionRunQuery } from '../application/queries/get-automation-execution-run.query';
import { ListAutomationExecutionRunsByStoryQuery } from '../application/queries/list-automation-execution-runs-by-story.query';
import { AutomationExecutionRunEntity } from '../domain/entities/automation-execution-run.entity';
import { AutomationExecutionRunDto, TriggerAutomationExecutionDto } from './dto';
import { toAutomationExecutionRunDto } from './automation-execution.presenter';

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
  ) {}

  @Get(':id')
  @RequirePermission('automation:read')
  async detail(@Param('id') id: string): Promise<AutomationExecutionRunDto> {
    const run = await this.queryBus.execute<GetAutomationExecutionRunQuery, AutomationExecutionRunEntity>(
      new GetAutomationExecutionRunQuery(id),
    );
    return toAutomationExecutionRunDto(run);
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
