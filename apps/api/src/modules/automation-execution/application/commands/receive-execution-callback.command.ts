import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_EXECUTION_RUN_REPOSITORY,
  IAutomationExecutionRunRepository,
} from '../../domain/repositories/automation-execution-run.repository.interface';
import { AutomationExecutionRunEntity, AutomationExecutionStatus, AutomationTestResult } from '../../domain/entities/automation-execution-run.entity';

// The dispatched workflow POSTs twice: once right after checkout (STARTED, so the UI can show
// "Running" + a deep link to the live GitHub Actions log before results exist), and once at the
// end (COMPLETED, with the full result summary) -- this is the whole "live-ish progress" story,
// since true log streaming isn't possible without a persistent connection this Vercel-serverless
// API can't hold open.
export type ExecutionCallbackPayload =
  | { phase: 'STARTED'; githubRunId: string; githubRunUrl: string }
  | {
      phase: 'COMPLETED';
      status: Extract<AutomationExecutionStatus, 'PASSED' | 'FAILED' | 'ERROR' | 'CANCELLED'>;
      totalTests: number | null;
      passedTests: number | null;
      failedTests: number | null;
      skippedTests: number | null;
      testResults: AutomationTestResult[];
      logsText: string | null;
      errorMessage: string | null;
      reportArtifactUrl: string | null;
    };

export class ReceiveExecutionCallbackCommand {
  constructor(
    public readonly runId: string,
    public readonly payload: ExecutionCallbackPayload,
  ) {}
}

@CommandHandler(ReceiveExecutionCallbackCommand)
export class ReceiveExecutionCallbackHandler
  implements ICommandHandler<ReceiveExecutionCallbackCommand, AutomationExecutionRunEntity>
{
  constructor(
    @Inject(AUTOMATION_EXECUTION_RUN_REPOSITORY) private readonly runRepository: IAutomationExecutionRunRepository,
  ) {}

  async execute(command: ReceiveExecutionCallbackCommand): Promise<AutomationExecutionRunEntity> {
    const existing = await this.runRepository.findById(command.runId);
    if (!existing) {
      throw new NotFoundException('Automation execution run not found');
    }

    if (command.payload.phase === 'STARTED') {
      return this.runRepository.markStarted(command.runId, {
        githubRunId: command.payload.githubRunId,
        githubRunUrl: command.payload.githubRunUrl,
      });
    }

    return this.runRepository.markCompleted(command.runId, {
      status: command.payload.status,
      totalTests: command.payload.totalTests,
      passedTests: command.payload.passedTests,
      failedTests: command.payload.failedTests,
      skippedTests: command.payload.skippedTests,
      testResults: command.payload.testResults,
      logsText: command.payload.logsText,
      errorMessage: command.payload.errorMessage,
      reportArtifactUrl: command.payload.reportArtifactUrl,
    });
  }
}
