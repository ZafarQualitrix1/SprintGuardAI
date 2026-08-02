import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateTestCaseInput,
  ITestCaseRepository,
} from '../../domain/repositories/test-case.repository.interface';
import { toTestCaseEntity } from '../mappers';

@Injectable()
export class PrismaTestCaseRepository implements ITestCaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async replaceForScenario(testScenarioId: string, cases: CreateTestCaseInput[]) {
    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.testCase.deleteMany({ where: { testScenarioId } });

      const created = [];
      for (const testCase of cases) {
        const row = await tx.testCase.create({
          data: {
            testScenarioId,
            title: testCase.title,
            steps: testCase.steps as unknown as Prisma.InputJsonValue,
            priority: testCase.priority,
            description: testCase.description,
            severity: testCase.severity,
            module: testCase.module,
            testType: testCase.testType,
            tags: testCase.tags as unknown as Prisma.InputJsonValue,
            automationStatus: testCase.automationStatus,
            automationType: testCase.automationType,
            apiEndpoint: testCase.apiEndpoint,
            uiScreen: testCase.uiScreen,
          },
        });
        created.push(row);
      }
      return created;
    });

    return rows.map(toTestCaseEntity);
  }
}
