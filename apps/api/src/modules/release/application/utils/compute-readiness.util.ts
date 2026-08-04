import {
  DEFECT_SEVERITIES,
  MandatoryRuleFlag,
  ReleaseGateStatus,
  ReleaseReportBreakdown,
  ReleaseRiskCategory,
} from '../../domain/entities/release-report.entity';
import { ReleaseScoringConfigEntity } from '../../domain/entities/release-scoring-config.entity';
import {
  AutomationExecutionMetrics,
  BugRiskMetrics,
  ManualExecutionMetrics,
  RequirementCoverageMetrics,
  SprintGates,
  TestCaseCoverageMetrics,
} from '../../domain/repositories/release-metrics-read.repository.interface';

export interface ComputeReleaseReadinessInput {
  requirementCoverage: RequirementCoverageMetrics;
  testCaseCoverage: TestCaseCoverageMetrics;
  manualExecution: ManualExecutionMetrics;
  automationExecution: AutomationExecutionMetrics;
  bugRisk: BugRiskMetrics;
  gates: SprintGates;
  config: ReleaseScoringConfigEntity;
}

export interface ComputeReleaseReadinessResult {
  readinessScore: number;
  breakdown: ReleaseReportBreakdown;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function riskCategoryFor(score: number): ReleaseRiskCategory {
  if (score >= 95) return 'PRODUCTION_READY';
  if (score >= 90) return 'LOW_RISK';
  if (score >= 80) return 'MEDIUM_RISK';
  if (score >= 70) return 'HIGH_RISK';
  return 'NOT_RECOMMENDED';
}

function deploymentLabelFor(status: ReleaseGateStatus, score: number): string {
  if (status === 'BLOCKED') return 'Deployment Blocked';
  if (score >= 95) return 'Very Safe to Deploy';
  if (score >= 90) return 'Recommended';
  if (score >= 80) return 'Deploy with PM Approval';
  if (score >= 70) return 'High Risk';
  return 'Deployment Not Recommended';
}

// AI Release Readiness Algorithm: a configurable weighted-average of four positive signals
// (requirement coverage, test case coverage, manual pass rate, automation pass rate) plus an
// uncapped bug-risk component that can drag the composite score below zero when severe defects
// stack up (2 Blocker bugs => -200 alone, which is exactly why "Immediate Release Blocked" reads
// as 0%, not just "low"). Mandatory Release Rules are then layered on top as hard gates that can
// override what the raw score alone would suggest (e.g. any Blocker bug always blocks, regardless
// of how high coverage/pass-rates are).
export function computeReleaseReadiness(input: ComputeReleaseReadinessInput): ComputeReleaseReadinessResult {
  const { requirementCoverage, testCaseCoverage, manualExecution, automationExecution, bugRisk, gates, config } =
    input;

  const requirementComponent = (requirementCoverage.coveragePercent * config.requirementCoverageWeight) / 100;
  const testCaseComponent = (testCaseCoverage.coveragePercent * config.testCaseCoverageWeight) / 100;
  const manualComponent = (manualExecution.passRate * config.manualExecutionWeight) / 100;
  const automationComponent = (automationExecution.passRate * config.automationExecutionWeight) / 100;

  const totalDeduction = DEFECT_SEVERITIES.reduce((sum, severity) => {
    const count = bugRisk.openCounts[severity] ?? 0;
    const perBug = config.severityDeductions[severity] ?? 0;
    return sum + count * perBug;
  }, 0);
  // Deliberately NOT clamped at zero here -- the bug-risk component is meant to be able to pull
  // the whole composite score negative (before the final overall clamp), which is what makes a
  // handful of severe defects override an otherwise-healthy coverage/pass-rate score.
  const bugRiskComponent = config.bugRiskWeight + totalDeduction;

  const rawScore =
    requirementComponent + testCaseComponent + manualComponent + automationComponent + bugRiskComponent;
  const readinessScore = clamp(Math.round(rawScore), 0, 100);

  const hasBlocker = bugRisk.openCounts.BLOCKER > 0;
  const hasCritical = bugRisk.openCounts.CRITICAL > 0;
  const hasHighOrMajor = bugRisk.openCounts.HIGH > 0 || bugRisk.openCounts.MAJOR > 0;
  const passRateBelowThreshold = manualExecution.passRate < config.manualPassRateBlockThreshold;
  const automationBelowThreshold = automationExecution.passRate < config.automationCoverageWarnThreshold;
  const requirementIncomplete = requirementCoverage.coveragePercent < 100;
  const manualPending = manualExecution.pendingCount > 0;
  const regressionIncomplete = !gates.regressionCompleted;
  const checklistIncomplete = !gates.deploymentChecklistComplete;

  const mandatoryFlags: MandatoryRuleFlag[] = [];
  if (hasBlocker) {
    mandatoryFlags.push({
      rule: 'BLOCKER_BUG_OPEN',
      message: 'Immediate release blocked — Blocker defect(s) are open.',
      severity: 'BLOCK',
    });
  }
  if (hasCritical) {
    mandatoryFlags.push({
      rule: 'CRITICAL_BUG_OPEN',
      message: 'Critical defect(s) open — release needs PM approval.',
      severity: 'BLOCK',
    });
  }
  if (passRateBelowThreshold) {
    mandatoryFlags.push({
      rule: 'MANUAL_PASS_RATE_BELOW_THRESHOLD',
      message: `Manual pass rate ${manualExecution.passRate}% is below the ${config.manualPassRateBlockThreshold}% release threshold — release blocked.`,
      severity: 'BLOCK',
    });
  }
  if (automationBelowThreshold) {
    mandatoryFlags.push({
      rule: 'AUTOMATION_COVERAGE_LOW',
      message: `Automation coverage is only ${automationExecution.passRate}% (below ${config.automationCoverageWarnThreshold}%) — Automation Coverage Low.`,
      severity: 'WARNING',
    });
  }
  if (requirementIncomplete) {
    mandatoryFlags.push({
      rule: 'INCOMPLETE_SCOPE',
      message: `Requirement coverage is ${requirementCoverage.coveragePercent}% — Incomplete Scope.`,
      severity: 'WARNING',
    });
  }
  if (manualPending) {
    mandatoryFlags.push({
      rule: 'TESTING_IN_PROGRESS',
      message: `${manualExecution.pendingCount} test case(s) not yet executed — Testing In Progress.`,
      severity: 'WARNING',
    });
  }
  if (regressionIncomplete) {
    mandatoryFlags.push({
      rule: 'REGRESSION_INCOMPLETE',
      message: 'Regression testing has not been completed — release blocked.',
      severity: 'BLOCK',
    });
  }
  if (checklistIncomplete) {
    mandatoryFlags.push({
      rule: 'DEPLOYMENT_CHECKLIST_INCOMPLETE',
      message: 'Deployment checklist is incomplete — release blocked.',
      severity: 'BLOCK',
    });
  }

  // Final Release Decision Logic. Precedence matters:
  //   1. Any Blocker, or an incomplete operational gate (pass rate/regression/checklist), is an
  //      absolute block -- these can't be overridden by a PM, only fixed.
  //   2. An open Critical (with no Blocker and no failed operational gate) asks a PM to decide
  //      rather than auto-rejecting -- checked BEFORE the raw score threshold, since a Critical's
  //      -40 deduction alone is enough to push the score under 80 given the default weights, and
  //      that shouldn't silently collapse into the same bucket as "score is just low".
  //   3. Everything else is scored on the raw number: >=90 with strong sub-scores is a clean
  //      approval, the 80-89 band with nothing worse than Medium/Minor/Trivial open is a
  //      conditional approval, sub-80 is blocked, and the remaining 80-89-with-High/Major case
  //      falls back to PM approval rather than a flat reject.
  let releaseStatus: ReleaseGateStatus;
  if (hasBlocker || passRateBelowThreshold || regressionIncomplete || checklistIncomplete) {
    releaseStatus = 'BLOCKED';
  } else if (hasCritical) {
    releaseStatus = 'NEEDS_PM_APPROVAL';
  } else if (
    readinessScore >= 90 &&
    manualExecution.passRate >= 95 &&
    automationExecution.passRate >= 90 &&
    requirementCoverage.coveragePercent === 100
  ) {
    releaseStatus = 'APPROVED';
  } else if (readinessScore >= 80 && !hasHighOrMajor) {
    releaseStatus = 'CONDITIONAL_APPROVAL';
  } else if (readinessScore < 80) {
    releaseStatus = 'BLOCKED';
  } else {
    releaseStatus = 'NEEDS_PM_APPROVAL';
  }

  const riskCategory = riskCategoryFor(readinessScore);
  const deploymentProbability = releaseStatus === 'BLOCKED' ? 0 : readinessScore;
  const deploymentLabel = deploymentLabelFor(releaseStatus, readinessScore);

  const breakdown: ReleaseReportBreakdown = {
    requirementCoveragePercent: requirementCoverage.coveragePercent,
    totalRequirements: requirementCoverage.totalRequirements,
    coveredRequirements: requirementCoverage.coveredRequirements,

    testCaseCoveragePercent: testCaseCoverage.coveragePercent,
    totalTestCases: testCaseCoverage.totalTestCases,
    approvedTestCases: testCaseCoverage.approvedTestCases,

    manualPassRate: manualExecution.passRate,
    manualExecutedCount: manualExecution.executedCount,
    manualPassedCount: manualExecution.passedCount,
    manualFailedCount: manualExecution.failedCount,
    manualPendingCount: manualExecution.pendingCount,

    automationPassRate: automationExecution.passRate,
    automationExecutedCount: automationExecution.executedCount,
    automationPassedCount: automationExecution.passedCount,
    automationFailedCount: automationExecution.failedCount,

    bugRisk: {
      openCounts: bugRisk.openCounts,
      totalDeduction,
      component: bugRiskComponent,
    },

    regressionCompleted: gates.regressionCompleted,
    deploymentChecklistComplete: gates.deploymentChecklistComplete,

    riskCategory,
    releaseStatus,
    deploymentProbability,
    deploymentLabel,
    mandatoryFlags,

    // Legacy aliases for existing readers (analytics dashboard averages, etc.)
    coveragePercent: requirementCoverage.coveragePercent,
    executionPassRate: manualExecution.passRate,
    executedCount: manualExecution.executedCount,
    passedCount: manualExecution.passedCount,
    failedCount: manualExecution.failedCount,
  };

  return { readinessScore, breakdown };
}
