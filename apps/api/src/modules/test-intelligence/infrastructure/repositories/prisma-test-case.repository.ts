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

  // Atomically reserves `count` sequence numbers for storyId and returns the display-ID prefix +
  // the first number in the reserved block -- callers assign prefix-{first}, prefix-{first+1}, ...
  private async reserveDisplayIdBlock(
    tx: Prisma.TransactionClient,
    storyId: string,
    count: number,
  ): Promise<{ prefix: string; first: number } | null> {
    if (count === 0) return null;
    const story = await tx.story.update({
      where: { id: storyId },
      data: { testCaseSequenceCounter: { increment: count } },
      select: { testCaseSequenceCounter: true, externalId: true },
    });
    const first = story.testCaseSequenceCounter - count + 1;
    return { prefix: story.externalId ?? storyId, first };
  }

  async replaceForScenario(testScenarioId: string, storyId: string, cases: CreateTestCaseInput[]) {
    const rows = await this.prisma.$transaction(async (tx) => {
      await tx.testCase.deleteMany({ where: { testScenarioId } });

      const block = await this.reserveDisplayIdBlock(tx, storyId, cases.length);

      const created = [];
      for (let i = 0; i < cases.length; i++) {
        const testCase = cases[i];
        const row = await tx.testCase.create({
          data: {
            testScenarioId,
            displayId: block ? `${block.prefix}-TC-${block.first + i}` : null,
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
            testObjective: testCase.testObjective,
            preconditions: testCase.preconditions as unknown as Prisma.InputJsonValue,
            dependencies: testCase.dependencies,
            requestMethod: testCase.requestMethod,
            requestPayload: testCase.requestPayload as unknown as Prisma.InputJsonValue,
            expectedStatusCode: testCase.expectedStatusCode,
            expectedResponse: testCase.expectedResponse,
            remarks: testCase.remarks,
          },
        });
        created.push(row);
      }
      return created;
    // Prisma's default interactive-transaction timeout is 5000ms -- see prisma-requirement.repository.ts
    // for why sequential per-row creates need explicit headroom.
    }, { timeout: 15000 });

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
            ...(fields.testObjective !== undefined ? { testObjective: fields.testObjective } : {}),
            ...(fields.preconditions !== undefined
              ? { preconditions: fields.preconditions as unknown as Prisma.InputJsonValue }
              : {}),
            ...(fields.dependencies !== undefined ? { dependencies: fields.dependencies } : {}),
            ...(fields.requestMethod !== undefined ? { requestMethod: fields.requestMethod } : {}),
            ...(fields.requestPayload !== undefined
              ? { requestPayload: fields.requestPayload as unknown as Prisma.InputJsonValue }
              : {}),
            ...(fields.expectedStatusCode !== undefined ? { expectedStatusCode: fields.expectedStatusCode } : {}),
            ...(fields.expectedResponse !== undefined ? { expectedResponse: fields.expectedResponse } : {}),
            ...(fields.remarks !== undefined ? { remarks: fields.remarks } : {}),
            // displayId is deliberately never updated -- it's minted once and stays stable across
            // every BA-review version, per CreateTestCaseInput's own documentation.
          },
        });
      }

      const block = await this.reserveDisplayIdBlock(tx, changeset.storyId, changeset.added.length);

      for (let i = 0; i < changeset.added.length; i++) {
        const testCase = changeset.added[i];
        await tx.testCase.create({
          data: {
            testScenarioId: testCase.testScenarioId,
            displayId: block ? `${block.prefix}-TC-${block.first + i}` : null,
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
            testObjective: testCase.testObjective,
            preconditions: testCase.preconditions as unknown as Prisma.InputJsonValue,
            dependencies: testCase.dependencies,
            requestMethod: testCase.requestMethod,
            requestPayload: testCase.requestPayload as unknown as Prisma.InputJsonValue,
            expectedStatusCode: testCase.expectedStatusCode,
            expectedResponse: testCase.expectedResponse,
            remarks: testCase.remarks,
          },
        });
        affectedScenarioIds.add(testCase.testScenarioId);
      }
    // Prisma's default interactive-transaction timeout is 5000ms -- see prisma-requirement.repository.ts
    // for why sequential per-row writes need explicit headroom.
    }, { timeout: 15000 });

    if (affectedScenarioIds.size === 0) {
      return [];
    }
    const rows = await this.prisma.testCase.findMany({ where: { testScenarioId: { in: [...affectedScenarioIds] } } });
    return rows.map(toTestCaseEntity);
  }
}
