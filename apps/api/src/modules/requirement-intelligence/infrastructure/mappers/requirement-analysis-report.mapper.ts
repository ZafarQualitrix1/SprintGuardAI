import type { RequirementAnalysisReport as RequirementAnalysisReportRow } from '@sprintguard/database';
import { RequirementAnalysisReportEntity } from '../../domain/entities/requirement-analysis-report.entity';
import { DeepRequirementAnalysisOutput } from '../../application/schemas/deep-requirement-analysis.schema';

export function toRequirementAnalysisReportEntity(row: RequirementAnalysisReportRow): RequirementAnalysisReportEntity {
  return new RequirementAnalysisReportEntity(
    row.id,
    row.storyId,
    row.sprintId,
    row.organizationId,
    row.aiProvider,
    row.model,
    row.promptVersion,
    row.version,
    row.isLatest,
    row.generatedBy,
    row.analysisJson as Omit<DeepRequirementAnalysisOutput, 'testCases' | 'coverage'>,
    row.testCasesJson as DeepRequirementAnalysisOutput['testCases'],
    row.coverageJson as DeepRequirementAnalysisOutput['coverage'],
    row.confidenceScore,
    row.createdAt,
  );
}
