export interface CoverageMatrixEntry {
  id: string;
  requirementId: string;
  requirementText: string;
  coverageStatus: string;
  testCaseId: string | null;
}

export interface Gap {
  id: string;
  requirementId: string | null;
  requirementText: string | null;
  gapType: string;
  severity: string;
  description: string;
}

export interface CoverageSummary {
  totalRequirements: number;
  coveredCount: number;
  partiallyCoveredCount: number;
  notCoveredCount: number;
  coveragePercent: number;
}

export interface CoverageRecommendationScenario {
  requirementText: string;
  suggestedScenario: string;
  reason: string;
}

export interface CoverageRecommendation {
  qualityScore: number;
  missingScenarios: CoverageRecommendationScenario[];
  summary: string;
}

export interface CoverageResult {
  sprintId: string;
  summary: CoverageSummary;
  entries: CoverageMatrixEntry[];
  gaps: Gap[];
  // Only ever populated on the response returned directly from POST .../coverage/compute --
  // GET .../coverage always returns null here (not persisted, see apps/api's CoverageResultEntity).
  aiRecommendation: CoverageRecommendation | null;
  computedAt: string | null;
}

export interface CoverageDimensions {
  requirementCoverage: number;
  acceptanceCriteriaCoverage: number;
  functionalCoverage: number;
  boundaryCoverage: number;
  negativeCoverage: number;
  riskCoverage: number;
  automationCoverage: number;
}

export interface TraceabilityTestCase {
  id: string;
  title: string;
  testType: string;
  automationStatus: string;
}

export interface TraceabilityAcceptanceCriterion {
  id: string;
  given: string;
  when: string;
  then: string;
  testCases: TraceabilityTestCase[];
}

export interface TraceabilityRequirement {
  requirementId: string;
  requirementText: string;
  acceptanceCriteria: TraceabilityAcceptanceCriterion[];
}

export interface StoryCoverageResult {
  storyId: string;
  storyTitle: string;
  summary: CoverageSummary;
  dimensions: CoverageDimensions;
  entries: CoverageMatrixEntry[];
  gaps: Gap[];
  missingTestScenarios: string[];
  missingAcceptanceCriteria: string[];
  traceabilityMatrix: TraceabilityRequirement[];
  // Only populated on the response returned directly from POST .../coverage/compute -- same
  // never-persisted semantics as CoverageResult.aiRecommendation above.
  aiRecommendation: CoverageRecommendation | null;
  computedAt: string;
}
