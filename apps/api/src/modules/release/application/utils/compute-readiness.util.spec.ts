import { DEFAULT_RELEASE_SCORING_CONFIG } from '../../domain/entities/release-scoring-config.entity';
import {
  AutomationExecutionMetrics,
  BugRiskMetrics,
  ManualExecutionMetrics,
  RequirementCoverageMetrics,
  SprintGates,
  TestCaseCoverageMetrics,
} from '../../domain/repositories/release-metrics-read.repository.interface';
import { ComputeReleaseReadinessInput, computeReleaseReadiness } from './compute-readiness.util';

const config = { projectId: 'project-1', ...DEFAULT_RELEASE_SCORING_CONFIG };

const perfectRequirementCoverage: RequirementCoverageMetrics = {
  totalRequirements: 10,
  coveredRequirements: 10,
  coveragePercent: 100,
};
const perfectTestCaseCoverage: TestCaseCoverageMetrics = {
  totalTestCases: 20,
  approvedTestCases: 20,
  coveragePercent: 100,
};
const perfectManualExecution: ManualExecutionMetrics = {
  totalTestCases: 20,
  executedCount: 20,
  passedCount: 20,
  failedCount: 0,
  pendingCount: 0,
  passRate: 100,
};
const perfectAutomationExecution: AutomationExecutionMetrics = {
  executedCount: 10,
  passedCount: 10,
  failedCount: 0,
  passRate: 100,
};
const noBugs: BugRiskMetrics = {
  openCounts: { BLOCKER: 0, CRITICAL: 0, HIGH: 0, MAJOR: 0, MEDIUM: 0, MINOR: 0, TRIVIAL: 0 },
};
const completedGates: SprintGates = { regressionCompleted: true, deploymentChecklistComplete: true };

function baseInput(overrides: Partial<ComputeReleaseReadinessInput> = {}): ComputeReleaseReadinessInput {
  return {
    requirementCoverage: perfectRequirementCoverage,
    testCaseCoverage: perfectTestCaseCoverage,
    manualExecution: perfectManualExecution,
    automationExecution: perfectAutomationExecution,
    bugRisk: noBugs,
    gates: completedGates,
    config,
    ...overrides,
  };
}

describe('computeReleaseReadiness', () => {
  it('is 100 with perfect coverage/pass-rates and no open bugs', () => {
    const { readinessScore, breakdown } = computeReleaseReadiness(baseInput());
    expect(readinessScore).toBe(100);
    expect(breakdown.riskCategory).toBe('PRODUCTION_READY');
    expect(breakdown.releaseStatus).toBe('APPROVED');
    expect(breakdown.deploymentProbability).toBe(100);
    expect(breakdown.deploymentLabel).toBe('Very Safe to Deploy');
    expect(breakdown.mandatoryFlags).toHaveLength(0);
  });

  it('scores only the bug-risk weight when coverage/pass-rates are zero but no bugs are open', () => {
    // No coverage/executions done yet, but also no known defects -- the bug-risk component stays
    // at its full weight (25), while the failing pass rate still blocks the release outright.
    const { readinessScore, breakdown } = computeReleaseReadiness(
      baseInput({
        requirementCoverage: { totalRequirements: 10, coveredRequirements: 0, coveragePercent: 0 },
        testCaseCoverage: { totalTestCases: 20, approvedTestCases: 0, coveragePercent: 0 },
        manualExecution: { totalTestCases: 20, executedCount: 0, passedCount: 0, failedCount: 0, pendingCount: 20, passRate: 0 },
        automationExecution: { executedCount: 0, passedCount: 0, failedCount: 0, passRate: 0 },
      }),
    );
    expect(readinessScore).toBe(25);
    expect(breakdown.releaseStatus).toBe('BLOCKED');
  });

  it('applies the documented default weight distribution', () => {
    // Only requirement coverage at 100%, everything else 0 -> exactly its 20-point weight.
    const { readinessScore } = computeReleaseReadiness(
      baseInput({
        testCaseCoverage: { totalTestCases: 20, approvedTestCases: 0, coveragePercent: 0 },
        manualExecution: { totalTestCases: 20, executedCount: 0, passedCount: 0, failedCount: 0, pendingCount: 20, passRate: 0 },
        automationExecution: { executedCount: 0, passedCount: 0, failedCount: 0, passRate: 0 },
      }),
    );
    expect(readinessScore).toBe(20 + 25); // requirement weight + full bug-risk weight (no open bugs)
  });

  it('2 Blocker bugs drive the score to 0% and BLOCKED, even with otherwise-perfect metrics', () => {
    const { readinessScore, breakdown } = computeReleaseReadiness(
      baseInput({ bugRisk: { openCounts: { ...noBugs.openCounts, BLOCKER: 2 } } }),
    );
    expect(readinessScore).toBe(0);
    expect(breakdown.releaseStatus).toBe('BLOCKED');
    expect(breakdown.deploymentProbability).toBe(0);
    expect(breakdown.mandatoryFlags.some((f) => f.rule === 'BLOCKER_BUG_OPEN')).toBe(true);
  });

  it('3 Critical bugs deduct exactly 120 points from the bug-risk component', () => {
    const { breakdown } = computeReleaseReadiness(
      baseInput({ bugRisk: { openCounts: { ...noBugs.openCounts, CRITICAL: 3 } } }),
    );
    expect(breakdown.bugRisk.totalDeduction).toBe(-120);
    expect(breakdown.releaseStatus).toBe('NEEDS_PM_APPROVAL');
  });

  it('10 Major bugs deduct exactly 100 points from the bug-risk component', () => {
    const { breakdown } = computeReleaseReadiness(
      baseInput({ bugRisk: { openCounts: { ...noBugs.openCounts, MAJOR: 10 } } }),
    );
    expect(breakdown.bugRisk.totalDeduction).toBe(-100);
  });

  it('blocks release when manual pass rate is below the 90% threshold (Rule 3)', () => {
    const { breakdown } = computeReleaseReadiness(
      baseInput({
        manualExecution: { totalTestCases: 20, executedCount: 20, passedCount: 17, failedCount: 3, pendingCount: 0, passRate: 85 },
      }),
    );
    expect(breakdown.releaseStatus).toBe('BLOCKED');
    expect(breakdown.mandatoryFlags.some((f) => f.rule === 'MANUAL_PASS_RATE_BELOW_THRESHOLD')).toBe(true);
  });

  it('warns on low automation coverage without blocking (Rule 4)', () => {
    const { breakdown } = computeReleaseReadiness(
      baseInput({ automationExecution: { executedCount: 10, passedCount: 5, failedCount: 5, passRate: 50 } }),
    );
    expect(breakdown.mandatoryFlags.some((f) => f.rule === 'AUTOMATION_COVERAGE_LOW' && f.severity === 'WARNING')).toBe(
      true,
    );
    expect(breakdown.releaseStatus).not.toBe('BLOCKED');
  });

  it('flags incomplete scope without blocking when requirement coverage < 100% (Rule 5)', () => {
    const { breakdown } = computeReleaseReadiness(
      baseInput({ requirementCoverage: { totalRequirements: 10, coveredRequirements: 8, coveragePercent: 80 } }),
    );
    expect(breakdown.mandatoryFlags.some((f) => f.rule === 'INCOMPLETE_SCOPE')).toBe(true);
  });

  it('flags testing in progress when test cases are still pending (Rule 6)', () => {
    const { breakdown } = computeReleaseReadiness(
      baseInput({
        manualExecution: { totalTestCases: 20, executedCount: 15, passedCount: 15, failedCount: 0, pendingCount: 5, passRate: 100 },
      }),
    );
    expect(breakdown.mandatoryFlags.some((f) => f.rule === 'TESTING_IN_PROGRESS')).toBe(true);
  });

  it('blocks release when regression is not completed (Rule 7)', () => {
    const { breakdown } = computeReleaseReadiness(
      baseInput({ gates: { regressionCompleted: false, deploymentChecklistComplete: true } }),
    );
    expect(breakdown.releaseStatus).toBe('BLOCKED');
    expect(breakdown.mandatoryFlags.some((f) => f.rule === 'REGRESSION_INCOMPLETE')).toBe(true);
  });

  it('blocks release when the deployment checklist is incomplete (Rule 8)', () => {
    const { breakdown } = computeReleaseReadiness(
      baseInput({ gates: { regressionCompleted: true, deploymentChecklistComplete: false } }),
    );
    expect(breakdown.releaseStatus).toBe('BLOCKED');
    expect(breakdown.mandatoryFlags.some((f) => f.rule === 'DEPLOYMENT_CHECKLIST_INCOMPLETE')).toBe(true);
  });

  it('bands risk categories on the raw score', () => {
    expect(computeReleaseReadiness(baseInput()).breakdown.riskCategory).toBe('PRODUCTION_READY');
    expect(
      computeReleaseReadiness(baseInput({ automationExecution: { executedCount: 10, passedCount: 6, failedCount: 4, passRate: 60 } }))
        .breakdown.riskCategory,
    ).toBe('LOW_RISK');
  });
});
