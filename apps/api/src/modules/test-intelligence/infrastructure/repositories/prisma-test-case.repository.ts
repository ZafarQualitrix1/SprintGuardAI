import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';
import {
  CreateTestCaseInput,
  ITestCaseRepository,
  TestCaseChangeset,
} from '../../domain/repositories/test-case.repository.interface';
import { toTestCaseEntity } from '../mappers';
import { TestCaseEntity } from '../../domain/entities/test-artifact.entity';

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

  async applyChangeset(changeset: TestCaseChangeset): Promise<TestCaseEntity[]> {
    const affectedScenarioIds = new Set<string>();

    // Captured before deletion -- once removedIds are gone, there's no way to know which scenario
    // they belonged to for the post-changeset re-read below.
    const touchedExistingIds = [...changeset.modified.map((tc) => tc.id), ...changeset.removedIds];
    if (touchedExistingIds.length > 0) {
      const existing = await this.prisma.testCase.findMany({
        where: { id: { in: touchedExistingIds } },
        select: { testScenarioId: true },
      });
      existing.forEach((row) => affectedScenarioIds.add(row.testScenarioId));
    }

    await this.prisma.$transaction(async (tx) => {
      if (changeset.removedIds.length > 0) {
        await tx.testCase.deleteMany({ where: { id: { in: changeset.removedIds } } });
      }

      for (const testCase of changeset.modified) {
        const { id, ...fields } = testCase;
        await tx.testCase.update({
          where: { id },
          data: {
            ...(fields.title !== undefined ? { title: fields.title } : {}),
            ...(fields.steps !== undefined ? { steps: fields.steps as unknown as Prisma.InputJsonValue } : {}),
            ...(fields.priority !== undefined ? { priority: fields.priority } : {}),
            ...(fields.description !== undefined ? { description: fields.description } : {}),
            ...(fields.severity !== undefined ? { severity: fields.severity } : {}),
            ...(fields.module !== undefined ? { module: fields.module } : {}),
            ...(fields.testType !== undefined ? { testType: fields.testType } : {}),
            ...(fields.tags !== undefined ? { tags: fields.tags as unknown as Prisma.InputJsonValue } : {}),
            ...(fields.automationStatus !== undefined ? { automationStatus: fields.automationStatus } : {}),
            ...(fields.automationType !== undefined ? { automationType: fields.automationType } : {}),
            ...(fields.apiEndpoint !== undefined ? { apiEndpoint: fields.apiEndpoint } : {}),
            ...(fields.uiScreen !== undefined ? { uiScreen: fields.uiScreen } : {}),
          },
        });
      }

      for (const testCase of changeset.added) {
        await tx.testCase.create({
          data: {
            testScenarioId: testCase.testScenarioId,
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
        affectedScenarioIds.add(testCase.testScenarioId);
      }
    });

    if (affectedScenarioIds.size === 0) {
      return [];
    }
    const rows = await this.prisma.testCase.findMany({ where: { testScenarioId: { in: [...affectedScenarioIds] } } });
    return rows.map(toTestCaseEntity);
  }
}
