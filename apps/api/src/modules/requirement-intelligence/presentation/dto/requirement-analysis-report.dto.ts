import { DeepRequirementAnalysisOutput } from '../../application/schemas/deep-requirement-analysis.schema';

export interface RequirementAnalysisReportDto {
  id: string;
  storyId: string;
  sprintId: string;
  aiProvider: string;
  model: string;
  promptVersion: string;
  version: number;
  isLatest: boolean;
  generatedBy: string | null;
  analysis: Omit<DeepRequirementAnalysisOutput, 'testCases' | 'coverage'>;
  testCases: DeepRequirementAnalysisOutput['testCases'];
  coverage: DeepRequirementAnalysisOutput['coverage'];
  confidenceScore: number | null;
  createdAt: string;
}
