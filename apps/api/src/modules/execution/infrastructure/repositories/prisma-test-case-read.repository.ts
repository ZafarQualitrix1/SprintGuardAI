import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import { ITestCaseReadRepository } from '../../domain/repositories/test-case-read.repository.interface';

@Injectable()
export class PrismaTestCaseReadRepository implements ITestCaseReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(testCaseId: string, organizationId: string) {
    const testCase = await this.prisma.testCase.findFirst({
      where: {
        id: testCaseId,
        testScenario: { story: { sprint: { project: { organizationId } } } },
      },
      select: { id: true, title: true, testScenario: { select: { storyId: true, story: { select: { sprintId: true } } } } },
    });

    return testCase
      ? { id: testCase.id, title: testCase.title, sprintId: testCase.testScenario.story.sprintId }
      : null;
  }
}
