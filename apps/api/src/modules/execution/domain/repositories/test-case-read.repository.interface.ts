export const TEST_CASE_READ_REPOSITORY = Symbol('ITestCaseReadRepository');

export interface TestCaseReadModel {
  id: string;
  title: string;
  sprintId: string;
}

// Read-only access into `test-intelligence`'s TestCase data -- needed to resolve which Sprint an
// Execution belongs to and to confirm tenant ownership before recording a result.
export interface ITestCaseReadRepository {
  findById(testCaseId: string, organizationId: string): Promise<TestCaseReadModel | null>;
}
