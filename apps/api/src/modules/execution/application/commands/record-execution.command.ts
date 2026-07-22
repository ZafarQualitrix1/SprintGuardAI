import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  TEST_CASE_READ_REPOSITORY,
  ITestCaseReadRepository,
} from '../../domain/repositories/test-case-read.repository.interface';
import { EXECUTION_REPOSITORY, IExecutionRepository } from '../../domain/repositories/execution.repository.interface';
import { ExecutionEntity, ExecutionStatus } from '../../domain/entities/execution.entity';

export class RecordExecutionCommand {
  constructor(
    public readonly organizationId: string,
    public readonly testCaseId: string,
    public readonly executedBy: string,
    public readonly status: ExecutionStatus,
    public readonly notes?: string,
    public readonly evidenceUrl?: string,
  ) {}
}

@CommandHandler(RecordExecutionCommand)
export class RecordExecutionHandler implements ICommandHandler<RecordExecutionCommand, ExecutionEntity> {
  constructor(
    @Inject(TEST_CASE_READ_REPOSITORY) private readonly testCaseReadRepository: ITestCaseReadRepository,
    @Inject(EXECUTION_REPOSITORY) private readonly executionRepository: IExecutionRepository,
  ) {}

  async execute(command: RecordExecutionCommand): Promise<ExecutionEntity> {
    const testCase = await this.testCaseReadRepository.findById(command.testCaseId, command.organizationId);
    if (!testCase) {
      throw new NotFoundException('Test case not found');
    }

    return this.executionRepository.record({
      testCaseId: testCase.id,
      sprintId: testCase.sprintId,
      status: command.status,
      executedBy: command.executedBy,
      notes: command.notes,
      evidenceUrl: command.evidenceUrl,
    });
  }
}
