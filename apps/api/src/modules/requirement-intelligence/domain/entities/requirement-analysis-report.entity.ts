import { DeepRequirementAnalysisOutput, DeepRequirementAnalysisTestCase } from '../../application/schemas/deep-requirement-analysis.schema';

export interface RequirementAnalysisCoverage {
  requirementCoveragePct: number;
  businessRuleCoveragePct: number;
  acceptanceCriteriaCoveragePct: number;
  validationCoveragePct: number;
  edgeCaseCoveragePct: number;
  riskCoveragePct: number;
  overallPct: number;
  uncovered: string[];
}

export class RequirementAnalysisReportEntity {
  constructor(
    public readonly id: string,
    public readonly storyId: string,
    public readonly sprintId: string,
    public readonly organizationId: string,
    public readonly aiProvider: string,
    public readonly model: string,
    public readonly promptVersion: string,
    public readonly version: number,
    public readonly isLatest: boolean,
    public readonly generatedBy: string | null,
    public readonly analysis: Omit<DeepRequirementAnalysisOutput, 'testCases' | 'coverage'>,
    public readonly testCases: DeepRequirementAnalysisTestCase[],
    public readonly coverage: RequirementAnalysisCoverage,
    public readonly confidenceScore: number | null,
    public readonly createdAt: Date,
  ) {}
}
