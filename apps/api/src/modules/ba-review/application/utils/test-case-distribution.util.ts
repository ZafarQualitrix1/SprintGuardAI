import { TestCaseDistribution, TestCaseSnapshotEntry } from '../../domain/entities/ba-review-cycle.entity';

const EMPTY_DISTRIBUTION: TestCaseDistribution = {
  FUNCTIONAL: 0,
  NEGATIVE: 0,
  BOUNDARY: 0,
  VALIDATION: 0,
  BUSINESS_RULE: 0,
  API: 0,
  UI: 0,
  SECURITY: 0,
  PERFORMANCE: 0,
  ACCESSIBILITY: 0,
  DATABASE: 0,
  INTEGRATION: 0,
  REGRESSION: 0,
  SMOKE: 0,
  SANITY: 0,
};

export function computeDistribution(snapshot: TestCaseSnapshotEntry[]): TestCaseDistribution {
  const distribution = { ...EMPTY_DISTRIBUTION };
  for (const scenario of snapshot) {
    for (const testCase of scenario.testCases) {
      const key = testCase.testType as keyof TestCaseDistribution;
      if (key in distribution) {
        distribution[key] += 1;
      }
    }
  }
  return distribution;
}

export function countTotalTestCases(snapshot: TestCaseSnapshotEntry[]): number {
  return snapshot.reduce((sum, scenario) => sum + scenario.testCases.length, 0);
}

// Automation readiness is derived directly from the snapshot (share of test cases already flagged
// AUTOMATABLE/AUTOMATED by the generation agent) rather than the Automation module's
// AutomationGeneration table -- that table only exists once a user has explicitly generated
// automation code, which may not have happened yet at BA-review time. Keeps ba-review decoupled
// from the automation module entirely.
export function computeAutomationReadinessPercent(snapshot: TestCaseSnapshotEntry[]): number | null {
  const total = countTotalTestCases(snapshot);
  if (total === 0) return null;
  const automatable = snapshot.reduce(
    (sum, scenario) =>
      sum + scenario.testCases.filter((tc) => tc.automationStatus === 'AUTOMATABLE' || tc.automationStatus === 'AUTOMATED').length,
    0,
  );
  return Math.round((automatable / total) * 1000) / 10;
}
