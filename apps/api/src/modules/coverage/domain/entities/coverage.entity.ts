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
