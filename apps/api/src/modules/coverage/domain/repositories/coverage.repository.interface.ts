import { CoverageResultEntity, CoverageStatus, GapSeverity, GapType } from '../entities/coverage.entity';

export const COVERAGE_REPOSITORY = Symbol('ICoverageRepository');

export interface CoverageMatrixEntryDraft {
  requirementId: string;
  coverageStatus: CoverageStatus;
  testCaseId: string | null;
}

export interface GapDraft {
  requirementId: string;
  gapType: GapType;
  severity: GapSeverity;
  description: string;
}

export interface ICoverageRepository {
  /** Full recompute: replaces every CoverageMatrixEntry/Gap row for the sprint in one transaction. */
  replaceForSprint(
    sprintId: string,
    projectId: string,
    entries: CoverageMatrixEntryDraft[],
    gaps: GapDraft[],
  ): Promise<void>;

  /** Current matrix/gaps for a sprint with requirement text denormalized for display, or null if
   * coverage has never been computed for this sprint. `aiRecommendation` is always null here --
   * see CoverageResultEntity's comment. */
  findBySprintId(sprintId: string): Promise<CoverageResultEntity | null>;
}
