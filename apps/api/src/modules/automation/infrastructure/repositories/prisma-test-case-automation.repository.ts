import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  AutomationCandidateFilters,
  ITestCaseAutomationRepository,
  TestCaseAutomationContext,
} from '../../domain/repositories/test-case-automation.repository.interface';

const SELECT = {
  id: true,
  displayId: true,
  title: true,
  description: true,
  steps: true,
  testData: true,
  priority: true,
  testType: true,
  automationStatus: true,
  automationType: true,
  apiEndpoint: true,
  requestMethod: true,
  uiScreen: true,
  createdAt: true,
  updatedAt: true,
  testScenario: {
    select: {
      id: true,
      title: true,
      storyId: true,
      story: { select: { id: true, externalId: true, title: true, sprintId: true } },
    },
  },
} as const;

type TestCaseRow = {
  id: string;
  displayId: string | null;
  title: string;
  description: string | null;
  steps: unknown;
  testData: unknown;
  priority: string;
  testType: string;
  automationStatus: string;
  automationType: string;
  apiEndpoint: string | null;
  requestMethod: string | null;
  uiScreen: string | null;
  createdAt: Date;
  updatedAt: Date;
  testScenario: {
    id: string;
    title: string;
    storyId: string;
    story: { id: string; externalId: string | null; title: string; sprintId: string };
  };
};

function toContext(row: TestCaseRow): TestCaseAutomationContext {
  return {
    id: row.id,
    displayId: row.displayId,
    title: row.title,
    description: row.description,
    steps: row.steps as unknown as { step: string; expected: string }[],
    testData: row.testData,
    priority: row.priority,
    testType: row.testType,
    automationStatus: row.automationStatus,
    automationType: row.automationType,
    apiEndpoint: row.apiEndpoint,
    requestMethod: row.requestMethod,
    uiScreen: row.uiScreen,
    storyId: row.testScenario.story.id,
    storyExternalId: row.testScenario.story.externalId,
    storyTitle: row.testScenario.story.title,
    scenarioId: row.testScenario.id,
    scenarioTitle: row.testScenario.title,
    sprintId: row.testScenario.story.sprintId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Shared by listApprovedApiCandidates and reclassifyStaleCandidates -- narrows to a Story whose
// Sprint belongs to this org (and optionally a specific project/sprint/story-id set).
function storyWhere(organizationId: string, filters?: AutomationCandidateFilters) {
  return {
    ...(filters?.storyIds?.length ? { id: { in: filters.storyIds } } : {}),
    ...(filters?.sprintId ? { sprintId: filters.sprintId } : {}),
    sprint: {
      project: {
        organizationId,
        ...(filters?.projectId ? { id: filters.projectId } : {}),
      },
    },
  };
}

@Injectable()
export class PrismaTestCaseAutomationRepository implements ITestCaseAutomationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(testCaseId: string, organizationId: string): Promise<TestCaseAutomationContext | null> {
    const row = await this.prisma.testCase.findFirst({
      where: { id: testCaseId, testScenario: { story: { sprint: { project: { organizationId } } } } },
      select: SELECT,
    });
    return row ? toContext(row) : null;
  }

  async listCandidatesBySprintId(sprintId: string, organizationId: string): Promise<TestCaseAutomationContext[]> {
    const rows = await this.prisma.testCase.findMany({
      where: {
        automationStatus: { in: ['AUTOMATABLE', 'AUTOMATED'] },
        testScenario: { story: { sprintId, sprint: { project: { organizationId } } } },
      },
      select: SELECT,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toContext);
  }

  async listApprovedApiCandidates(
    organizationId: string,
    filters?: AutomationCandidateFilters,
  ): Promise<TestCaseAutomationContext[]> {
    const rows = await this.prisma.testCase.findMany({
      where: {
        automationStatus: { in: ['AUTOMATABLE', 'AUTOMATED'] },
        automationType: 'API',
        testScenario: {
          story: { ...storyWhere(organizationId, filters), baReviewState: { isLocked: true, status: 'APPROVED' } },
        },
      },
      select: SELECT,
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map(toContext);
  }

  async markAutomated(testCaseId: string): Promise<void> {
    await this.prisma.testCase.update({ where: { id: testCaseId }, data: { automationStatus: 'AUTOMATED' } });
  }

  async reclassifyStaleCandidates(organizationId: string, filters?: AutomationCandidateFilters): Promise<number> {
    const staleScope = {
      automationStatus: 'MANUAL' as const,
      automationType: 'NONE' as const,
      testScenario: { story: storyWhere(organizationId, filters) },
    };

    const [apiReclassified, uiReclassified] = await Promise.all([
      this.prisma.testCase.updateMany({
        where: { ...staleScope, apiEndpoint: { not: null } },
        data: { automationStatus: 'AUTOMATABLE', automationType: 'API' },
      }),
      this.prisma.testCase.updateMany({
        where: { ...staleScope, apiEndpoint: null, uiScreen: { not: null } },
        data: { automationStatus: 'AUTOMATABLE', automationType: 'UI' },
      }),
    ]);

    return apiReclassified.count + uiReclassified.count;
  }
}
