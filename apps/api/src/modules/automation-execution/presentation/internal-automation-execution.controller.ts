import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Public } from '../../../common/decorators/public.decorator';
import { InternalSecretGuard } from '../../../common/guards/internal-secret.guard';
import { GetRunAutomationFilesQuery } from '../application/queries/get-run-automation-files.query';
import { ReceiveExecutionCallbackCommand } from '../application/commands/receive-execution-callback.command';
import { AutomationFile } from '../domain/repositories/automation-run-context-read.repository.interface';
import { AutomationExecutionRunEntity } from '../domain/entities/automation-execution-run.entity';
import { ExecutionCallbackDto } from './dto';
import { toAutomationExecutionRunDto } from './automation-execution.presenter';

// Called by .github/workflows/automation-execution.yml (InternalSecretGuard, same shared secret
// as integration-health-check.yml's sweep -- no logged-in user makes these requests).
@ApiExcludeController()
@Controller('internal/automation-execution/:runId')
export class InternalAutomationExecutionController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('files')
  @Public()
  @UseGuards(InternalSecretGuard)
  async files(@Param('runId') runId: string): Promise<AutomationFile[]> {
    return this.queryBus.execute<GetRunAutomationFilesQuery, AutomationFile[]>(new GetRunAutomationFilesQuery(runId));
  }

  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @Public()
  @UseGuards(InternalSecretGuard)
  async callback(@Param('runId') runId: string, @Body() dto: ExecutionCallbackDto) {
    const run = await this.commandBus.execute<ReceiveExecutionCallbackCommand, AutomationExecutionRunEntity>(
      new ReceiveExecutionCallbackCommand(
        runId,
        dto.phase === 'STARTED'
          ? { phase: 'STARTED', githubRunId: dto.githubRunId ?? '', githubRunUrl: dto.githubRunUrl ?? '' }
          : {
              phase: 'COMPLETED',
              status: dto.status ?? 'ERROR',
              totalTests: dto.totalTests ?? null,
              passedTests: dto.passedTests ?? null,
              failedTests: dto.failedTests ?? null,
              skippedTests: dto.skippedTests ?? null,
              testResults: dto.testResults ?? [],
              logsText: dto.logsText ?? null,
              errorMessage: dto.errorMessage ?? null,
              reportArtifactUrl: dto.reportArtifactUrl ?? null,
            },
      ),
    );
    return toAutomationExecutionRunDto(run);
  }
}
