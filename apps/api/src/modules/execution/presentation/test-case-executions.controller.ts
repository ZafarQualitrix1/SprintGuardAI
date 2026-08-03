import { Body, Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { RecordExecutionCommand } from '../application/commands/record-execution.command';
import { ExecutionEntity } from '../domain/entities/execution.entity';
import { RecordExecutionDto } from './dto/record-execution.dto';
import { ExecutionDto } from './dto/execution.dto';
import { toExecutionDto } from './execution.presenter';

@ApiTags('Execution')
@Controller('test-cases/:testCaseId/executions')
export class TestCaseExecutionsController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('execution:write')
  async record(
    @Param('testCaseId') testCaseId: string,
    @Body() dto: RecordExecutionDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ExecutionDto> {
    const execution = await this.commandBus.execute<RecordExecutionCommand, ExecutionEntity>(
      new RecordExecutionCommand(
        user.organizationId,
        testCaseId,
        user.userId,
        dto.status,
        dto.notes,
        dto.evidenceUrl,
        dto.actualResult,
        dto.attachmentUrls,
        dto.screenshotUrls,
        dto.defectReference,
        dto.executionDurationMs,
        dto.testerName,
      ),
    );
    return toExecutionDto(execution);
  }
}
