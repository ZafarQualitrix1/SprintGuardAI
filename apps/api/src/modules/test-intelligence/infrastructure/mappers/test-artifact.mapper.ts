import type { TestCase, TestScenario } from '@sprintguard/database';
import { TestCaseEntity, TestScenarioEntity, TestStep } from '../../domain/entities/test-artifact.entity';

type TestScenarioWithCases = TestScenario & { testCases: TestCase[] };

export function toTestCaseEntity(row: TestCase): TestCaseEntity {
  return new TestCaseEntity(
    row.id,
    row.testScenarioId,
    row.title,
    row.steps as unknown as TestStep[],
    row.priority,
    row.description,
    row.severity,
    row.module,
    row.testType,
    (row.tags as unknown as string[] | null) ?? [],
    row.automationStatus,
    row.automationType,
    row.apiEndpoint,
    row.uiScreen,
    row.displayId,
    row.testObjective,
    row.preconditions as unknown as string[] | null,
    row.dependencies,
    row.requestMethod,
    row.requestPayload as unknown as Record<string, unknown> | null,
    row.expectedStatusCode,
    row.expectedResponse,
    row.remarks,
  );
}

export function toTestScenarioEntity(row: TestScenarioWithCases): TestScenarioEntity {
  return new TestScenarioEntity(
    row.id,
    row.acceptanceCriterionId,
    row.storyId,
    row.title,
    row.description,
    row.priority,
    row.testCases.map(toTestCaseEntity),
  );
}
