import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  AUTOMATION_GENERATION_REPOSITORY,
  IAutomationGenerationRepository,
} from '../../domain/repositories/automation-generation.repository.interface';
import {
  AutomationCandidateFilters,
  TEST_CASE_AUTOMATION_REPOSITORY,
  ITestCaseAutomationRepository,
  TestCaseAutomationContext,
} from '../../domain/repositories/test-case-automation.repository.interface';
import { AutomationGenerationEntity } from '../../domain/entities/automation-generation.entity';

export interface ApprovedApiAutomationCandidateResult {
  testCase: TestCaseAutomationContext;
  latestGeneration: AutomationGenerationEntity | null;
}

// API Automation module's candidate feed: BA-approved + locked stories only, API-type test cases
// only, with the Project -> Sprint -> Story filter cascade the module's UI drives. Org-wide (not
// sprint-scoped) unlike ListAutomationCandidatesBySprintQuery, which this deliberately doesn't
// replace -- that one still backs the old per-sprint candidates route.
export class ListApprovedApiAutomationCandidatesQuery {
  constructor(
    public readonly organizationId: string,
    public readonly filters: AutomationCandidateFilters = {},
  ) {}
}

@QueryHandler(ListApprovedApiAutomationCandidatesQuery)
export class ListApprovedApiAutomationCandidatesHandler
  implements IQueryHandler<ListApprovedApiAutomationCandidatesQuery, ApprovedApiAutomationCandidateResult[]>
{
  constructor(
    @Inject(TEST_CASE_AUTOMATION_REPOSITORY) private readonly testCaseRepository: ITestCaseAutomationRepository,
    @Inject(AUTOMATION_GENERATION_REPOSITORY) private readonly automationRepository: IAutomationGenerationRepository,
  ) {}

  async execute(query: ListApprovedApiAutomationCandidatesQuery): Promise<ApprovedApiAutomationCandidateResult[]> {
    // Same self-heal as the sprint-scoped listing -- cheap, no AI calls, safe to run on every fetch.
    await this.testCaseRepository.reclassifyStaleCandidates(query.organizationId, query.filters);

    const candidates = await this.testCaseRepository.listApprovedApiCandidates(query.organizationId, query.filters);
    if (candidates.length === 0) return [];

    const latest = await this.automationRepository.listLatestForTestCaseIds(candidates.map((c) => c.id));
    const latestByTestCaseId = new Map<string, AutomationGenerationEntity>();
    for (const generation of latest) {
      if (generation.automationType === 'API') {
        latestByTestCaseId.set(generation.testCaseId, generation);
      }
    }

    return candidates.map((testCase) => ({
      testCase,
      latestGeneration: latestByTestCaseId.get(testCase.id) ?? null,
    }));
  }
}
