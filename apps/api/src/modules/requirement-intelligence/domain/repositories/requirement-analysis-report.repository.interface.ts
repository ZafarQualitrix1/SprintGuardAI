import { DeepRequirementAnalysisOutput } from '../../application/schemas/deep-requirement-analysis.schema';
import { RequirementAnalysisReportEntity } from '../entities/requirement-analysis-report.entity';

export const REQUIREMENT_ANALYSIS_REPORT_REPOSITORY = Symbol('IRequirementAnalysisReportRepository');

export interface CreateRequirementAnalysisReportInput {
  storyId: string;
  sprintId: string;
  organizationId: string;
  aiProvider: string;
  model: string;
  promptVersion: string;
  generatedBy: string | null;
  output: DeepRequirementAnalysisOutput;
  confidenceScore: number | null;
  generatedByAgentRunId: string | null;
  jiraSnapshot: Record<string, unknown>;
}

export interface IRequirementAnalysisReportRepository {
  /**
   * Creates a new version for the story, atomically flipping the previous latest row's isLatest
   * to false -- append-only version history, not in-place replacement (mirrors the
   * Requirement/AcceptanceCriterion "replace, don't merge" convention but keeps every prior
   * version instead of deleting it, since regenerate history is an explicit spec requirement).
   */
  createNewVersion(input: CreateRequirementAnalysisReportInput): Promise<RequirementAnalysisReportEntity>;
  findLatestByStoryId(storyId: string, organizationId: string): Promise<RequirementAnalysisReportEntity | null>;
  findHistoryByStoryId(storyId: string, organizationId: string): Promise<RequirementAnalysisReportEntity[]>;
}
