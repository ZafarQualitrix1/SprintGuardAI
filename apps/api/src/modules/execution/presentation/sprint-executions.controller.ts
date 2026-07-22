import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { QueryBus } from '@nestjs/cqrs';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetExecutionsBySprintQuery } from '../application/queries/get-executions-by-sprint.query';
import { ExecutionEntity } from '../domain/entities/execution.entity';
import { ExecutionDto } from './dto/execution.dto';
import { toExecutionDto } from './execution.presenter';

@ApiTags('Execution')
@Controller('sprints/:sprintId/executions')
export class SprintExecutionsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @RequirePermission('execution:read')
  async list(@Param('sprintId') sprintId: string): Promise<ExecutionDto[]> {
    const executions = await this.queryBus.execute<GetExecutionsBySprintQuery, ExecutionEntity[]>(
      new GetExecutionsBySprintQuery(sprintId),
    );
    return executions.map(toExecutionDto);
  }
}
