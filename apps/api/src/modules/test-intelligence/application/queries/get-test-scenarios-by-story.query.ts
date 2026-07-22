import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  TEST_SCENARIO_REPOSITORY,
  ITestScenarioRepository,
} from '../../domain/repositories/test-scenario.repository.interface';
import { TestScenarioEntity } from '../../domain/entities/test-artifact.entity';

export class GetTestScenariosByStoryQuery {
  constructor(public readonly storyId: string) {}
}

@QueryHandler(GetTestScenariosByStoryQuery)
export class GetTestScenariosByStoryHandler
  implements IQueryHandler<GetTestScenariosByStoryQuery, TestScenarioEntity[]>
{
  constructor(
    @Inject(TEST_SCENARIO_REPOSITORY) private readonly testScenarioRepository: ITestScenarioRepository,
  ) {}

  execute(query: GetTestScenariosByStoryQuery): Promise<TestScenarioEntity[]> {
    return this.testScenarioRepository.findByStoryId(query.storyId);
  }
}
