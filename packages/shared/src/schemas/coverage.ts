export interface CoverageMatrixEntry {
  id: string;
  requirementId: string;
  requirementText: string;
  coverageStatus: string;
}

export interface Gap {
  id: string;
  requirementText: string | null;
  gapType: string;
  severity: string;
  description: string;
}

export interface CoverageSummary {
  entries: CoverageMatrixEntry[];
  gaps: Gap[];
  coveragePercent: number;
}
