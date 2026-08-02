import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_GENERATION_REPOSITORY,
  IAutomationGenerationRepository,
} from '../../domain/repositories/automation-generation.repository.interface';
import { AutomationGenerationEntity } from '../../domain/entities/automation-generation.entity';

export class ListAutomationByTestCaseQuery {
  constructor(public readonly testCaseId: string) {}
}

@QueryHandler(ListAutomationByTestCaseQuery)
export class ListAutomationByTestCaseHandler
  implements IQueryHandler<ListAutomationByTestCaseQuery, AutomationGenerationEntity[]>
{
  constructor(
    @Inject(AUTOMATION_GENERATION_REPOSITORY) private readonly automationRepository: IAutomationGenerationRepository,
  ) {}

  execute(query: ListAutomationByTestCaseQuery): Promise<AutomationGenerationEntity[]> {
    return this.automationRepository.listByTestCaseId(query.testCaseId);
  }
}
