import { DefectSeverityLevel } from './release-report.entity';

export interface ReleaseScoringWeights {
  requirementCoverageWeight: number;
  testCaseCoverageWeight: number;
  manualExecutionWeight: number;
  automationExecutionWeight: number;
  bugRiskWeight: number;
}

export interface ReleaseScoringConfigEntity extends ReleaseScoringWeights {
  projectId: string;
  severityDeductions: Record<DefectSeverityLevel, number>;
  manualPassRateBlockThreshold: number;
  automationCoverageWarnThreshold: number;
}

// Default Weight Distribution + default deduction model from the AI Release Readiness Algorithm
// spec. Used whenever a project has no ReleaseScoringConfig row of its own.
export const DEFAULT_RELEASE_SCORING_CONFIG: Omit<ReleaseScoringConfigEntity, 'projectId'> = {
  requirementCoverageWeight: 20,
  testCaseCoverageWeight: 15,
  manualExecutionWeight: 20,
  automationExecutionWeight: 20,
  bugRiskWeight: 25,
  severityDeductions: {
    BLOCKER: -100,
    CRITICAL: -40,
    HIGH: -20,
    MAJOR: -10,
    MEDIUM: -5,
    MINOR: -2,
    TRIVIAL: -1,
  },
  manualPassRateBlockThreshold: 90,
  automationCoverageWarnThreshold: 70,
};
