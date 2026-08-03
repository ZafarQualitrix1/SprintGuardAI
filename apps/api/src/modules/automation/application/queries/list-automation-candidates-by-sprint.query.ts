import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_GENERATION_REPOSITORY,
  IAutomationGenerationRepository,
} from '../../domain/repositories/automation-generation.repository.interface';
import {
  TEST_CASE_AUTOMATION_REPOSITORY,
  ITestCaseAutomationRepository,
  TestCaseAutomationContext,
} from '../../domain/repositories/test-case-automation.repository.interface';
import { AutomationGenerationEntity } from '../../domain/entities/automation-generation.entity';

export interface AutomationCandidateResult {
  testCase: TestCaseAutomationContext;
  latestApi: AutomationGenerationEntity | null;
  latestUi: AutomationGenerationEntity | null;
}

export class ListAutomationCandidatesBySprintQuery {
  constructor(
    public readonly sprintId: string,
    public readonly organizationId: string,
  ) {}
}

@QueryHandler(ListAutomationCandidatesBySprintQuery)
export class ListAutomationCandidatesBySprintHandler
  implements IQueryHandler<ListAutomationCandidatesBySprintQuery, AutomationCandidateResult[]>
{
  constructor(
    @Inject(TEST_CASE_AUTOMATION_REPOSITORY) private readonly testCaseRepository: ITestCaseAutomationRepository,
    @Inject(AUTOMATION_GENERATION_REPOSITORY) private readonly automationRepository: IAutomationGenerationRepository,
  ) {}

  async execute(query: ListAutomationCandidatesBySprintQuery): Promise<AutomationCandidateResult[]> {
    // Self-heal test cases generated before automationStatus/automationType were reliably
    // classified (see test-generation.schema.ts) -- cheap (one updateMany per type, no AI calls),
    // safe to run on every fetch since it only ever touches cases still sitting at the MANUAL/NONE
    // defaults with an apiEndpoint/uiScreen already on record.
    await this.testCaseRepository.reclassifyStaleCandidates(query.sprintId, query.organizationId);

    const candidates = await this.testCaseRepository.listCandidatesBySprintId(query.sprintId, query.organizationId);
    if (candidates.length === 0) return [];

    const latest = await this.automationRepository.listLatestForTestCaseIds(candidates.map((c) => c.id));
    const latestByKey = new Map<string, AutomationGenerationEntity>();
    for (const generation of latest) {
      latestByKey.set(`${generation.testCaseId}:${generation.automationType}`, generation);
    }

    return candidates.map((testCase) => ({
      testCase,
      latestApi: latestByKey.get(`${testCase.id}:API`) ?? null,
      latestUi: latestByKey.get(`${testCase.id}:UI`) ?? null,
    }));
  }
}
