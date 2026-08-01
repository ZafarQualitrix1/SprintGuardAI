import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  ICoverageSourceReadRepository,
  SprintCoverageSource,
} from '../../domain/repositories/coverage-source-read.repository.interface';

@Injectable()
export class PrismaCoverageSourceReadRepository implements ICoverageSourceReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getSprintCoverageSource(sprintId: string, organizationId: string): Promise<SprintCoverageSource | null> {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, project: { organizationId } },
      select: { id: true, projectId: true, name: true },
    });
    if (!sprint) {
      return null;
    }

    // Single deep include with relationLoadStrategy 'join' -- this is the same fan-out shape
    // (Story -> Requirement -> AcceptanceCriterion -> TestScenario -> TestCase) that caused the
    // N+1 slow-API issue fixed elsewhere in the app (prisma-membership.repository.ts); without
    // 'join' this would resolve as several sequential round trips per requirement.
    const stories = await this.prisma.story.findMany({
      where: { sprintId },
      include: {
        requirements: {
          include: {
            acceptanceCriteria: {
              include: {
                testScenarios: {
                  include: {
                    testCases: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
      relationLoadStrategy: 'join',
    });

    const existingTestCases = await this.prisma.testCase.findMany({
      where: { testScenario: { story: { sprintId } } },
      select: { title: true },
    });

    const requirements = stories.flatMap((story) =>
      story.requirements.map((requirement) => ({
        id: requirement.id,
        text: requirement.text,
        acceptanceCriteria: requirement.acceptanceCriteria.map((ac) => {
          const testCaseIds = ac.testScenarios.flatMap((scenario) => scenario.testCases.map((tc) => tc.id));
          return {
            id: ac.id,
            hasTestCase: testCaseIds.length > 0,
            firstTestCaseId: testCaseIds[0] ?? null,
          };
        }),
      })),
    );

    return {
      projectId: sprint.projectId,
      sprintId: sprint.id,
      sprintName: sprint.name,
      requirements,
      existingTestCaseTitles: existingTestCases.map((tc) => tc.title),
    };
  }
}
