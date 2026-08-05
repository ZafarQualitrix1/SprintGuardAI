import { ListAutomationByTestCaseHandler } from './list-automation-by-test-case.query';
import { GetAutomationDetailHandler } from './get-automation-detail.query';
import { ListAutomationCandidatesBySprintHandler } from './list-automation-candidates-by-sprint.query';
import { ListApprovedApiAutomationCandidatesHandler } from './list-approved-api-automation-candidates.query';

export * from './list-automation-by-test-case.query';
export * from './get-automation-detail.query';
export * from './list-automation-candidates-by-sprint.query';
export * from './list-approved-api-automation-candidates.query';

export const AUTOMATION_QUERY_HANDLERS = [
  ListAutomationByTestCaseHandler,
  GetAutomationDetailHandler,
  ListAutomationCandidatesBySprintHandler,
  ListApprovedApiAutomationCandidatesHandler,
];
