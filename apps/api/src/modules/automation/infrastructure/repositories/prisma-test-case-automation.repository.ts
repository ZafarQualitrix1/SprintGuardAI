import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  ITestCaseAutomationRepository,
  TestCaseAutomationContext,
} from '../../domain/repositories/test-case-automation.repository.interface';

const SELECT = {
  id: true,
  title: true,
  description: true,
  steps: true,
  testData: true,
  priority: true,
  testType: true,
  automationStatus: true,
  automationType: true,
  apiEndpoint: true,
  uiScreen: true,
  testScenario: {
    select: {
      id: true,
      title: true,
      storyId: true,
      story: { select: { id: true, title: true, sprintId: true } },
    },
  },
} as const;

type TestCaseRow = {
  id: string;
  title: string;
  description: string | null;
  steps: unknown;
  testData: unknown;
  priority: string;
  testType: string;
  automationStatus: string;
  automationType: string;
  apiEndpoint: string | null;
  uiScreen: string | null;
  testScenario: { id: string; title: string; storyId: string; story: { id: string; title: string; sprintId: string } };
};

function toContext(row: TestCaseRow): TestCaseAutomationContext {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    steps: row.steps as unknown as { step: string; expected: string }[],
    testData: row.testData,
    priority: row.priority,
    testType: row.testType,
    automationStatus: row.automationStatus,
    automationType: row.automationType,
    apiEndpoint: row.apiEndpoint,
    uiScreen: row.uiScreen,
    storyId: row.testScenario.story.id,
    storyTitle: row.testScenario.story.title,
    scenarioId: row.testScenario.id,
    scenarioTitle: row.testScenario.title,
    sprintId: row.testScenario.story.sprintId,
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

  async markAutomated(testCaseId: string): Promise<void> {
    await this.prisma.testCase.update({ where: { id: testCaseId }, data: { automationStatus: 'AUTOMATED' } });
  }

  async reclassifyStaleCandidates(sprintId: string, organizationId: string): Promise<number> {
    const staleScope = {
      automationStatus: 'MANUAL' as const,
      automationType: 'NONE' as const,
      testScenario: { story: { sprintId, sprint: { project: { organizationId } } } },
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
