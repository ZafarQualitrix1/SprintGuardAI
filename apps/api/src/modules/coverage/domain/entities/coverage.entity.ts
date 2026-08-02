export type CoverageStatus = 'COVERED' | 'PARTIALLY_COVERED' | 'NOT_COVERED';
export type GapType = 'MISSING_TEST' | 'MISSING_AC';
export type GapSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CoverageMatrixEntryEntity {
  id: string;
  requirementId: string;
  requirementText: string;
  coverageStatus: CoverageStatus;
  testCaseId: string | null;
}

export interface GapEntity {
  id: string;
  requirementId: string | null;
  requirementText: string | null;
  gapType: GapType;
  severity: GapSeverity;
  description: string;
}

export interface CoverageSummary {
  totalRequirements: number;
  coveredCount: number;
  partiallyCoveredCount: number;
  notCoveredCount: number;
  // Matches IReleaseMetricsReadRepository.getCoverageMetrics' formula exactly (COVERED / total,
  // partial does not count) so this page and the Release Readiness page never show conflicting
  // numbers for the same sprint.
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

export class CoverageResultEntity {
  constructor(
    public readonly sprintId: string,
    public readonly summary: CoverageSummary,
    public readonly entries: CoverageMatrixEntryEntity[],
    public readonly gaps: GapEntity[],
    // Only ever populated on the response returned directly from a Compute call -- not
    // persisted anywhere, so a subsequent GET always sees null here (see coverage.module.ts
    // and ComputeCoverageHandler for why: there's no CoverageReport-style table to save it to,
    // and adding one is out of scope for this pass).
    public readonly aiRecommendation: CoverageRecommendation | null,
    public readonly computedAt: Date | null,
  ) {}
}

// Category coverage isn't stored anywhere -- it's derived on every read straight from
// TestCase.testType/automationStatus (see deriveStoryCoverage), which is why the story-scoped GET
// query has no persistence step at all (see get-story-coverage.query.ts).
export interface CoverageDimensions {
  requirementCoverage: number;
  acceptanceCriteriaCoverage: number;
  functionalCoverage: number;
  apiCoverage: number;
  uiCoverage: number;
  securityCoverage: number;
  performanceCoverage: number;
  accessibilityCoverage: number;
  automationCoverage: number;
  manualCoverage: number;
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

export class StoryCoverageResultEntity {
  constructor(
    public readonly storyId: string,
    public readonly storyTitle: string,
    public readonly summary: CoverageSummary,
    public readonly dimensions: CoverageDimensions,
    public readonly entries: CoverageMatrixEntryEntity[],
    public readonly gaps: GapEntity[],
    public readonly missingTestScenarios: string[],
    public readonly missingEdgeCases: string[],
    public readonly traceabilityMatrix: TraceabilityRequirement[],
    // Same "compute-only, never persisted" semantics as CoverageResultEntity.aiRecommendation.
    public readonly aiRecommendation: CoverageRecommendation | null,
    public readonly computedAt: Date,
  ) {}
}
