import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetExecutionsByStoryQuery } from '../application/queries/get-executions-by-story.query';
import { ExecutionEntity } from '../domain/entities/execution.entity';
import { ExecutionDto } from './dto/execution.dto';
import { toExecutionDto } from './execution.presenter';

@ApiTags('Execution')
@Controller('stories/:storyId/executions')
export class StoryExecutionsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission('execution:read')
  async list(@Param('storyId') storyId: string): Promise<ExecutionDto[]> {
    const executions = await this.queryBus.execute<GetExecutionsByStoryQuery, ExecutionEntity[]>(
      new GetExecutionsByStoryQuery(storyId),
    );
    return executions.map(toExecutionDto);
  }
}
