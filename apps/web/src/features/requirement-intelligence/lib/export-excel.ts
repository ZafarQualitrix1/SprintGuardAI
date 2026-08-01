import * as XLSX from 'xlsx';
import type { RequirementAnalysisReport } from '@sprintguard/shared';

function toSheet(rows: Record<string, unknown>[]) {
  return XLSX.utils.json_to_sheet(rows);
}

export function exportAnalysisReportToExcel(report: RequirementAnalysisReport): void {
  const { analysis, testCases, coverage } = report;
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    toSheet([
      { Field: 'Summary', Value: analysis.summary },
      { Field: 'AI Provider', Value: `${report.aiProvider}/${report.model}` },
      { Field: 'Prompt Version', Value: report.promptVersion },
      { Field: 'Report Version', Value: report.version },
      { Field: 'Generated At', Value: report.createdAt },
      { Field: 'Overall Coverage %', Value: coverage.overallPct },
    ]),
    'Summary',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    toSheet(analysis.functionalRequirements.map((text, index) => ({ '#': index + 1, Requirement: text }))),
    'Functional Requirements',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    toSheet(analysis.businessRules.map((text, index) => ({ '#': index + 1, Rule: text }))),
    'Business Rules',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    toSheet([
      ...analysis.risks.business.map((text) => ({ Category: 'Business', Risk: text })),
      ...analysis.risks.technical.map((text) => ({ Category: 'Technical', Risk: text })),
      ...analysis.risks.testing.map((text) => ({ Category: 'Testing', Risk: text })),
      ...analysis.risks.deployment.map((text) => ({ Category: 'Deployment', Risk: text })),
    ]),
    'Risks',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    toSheet(analysis.edgeCases.map((text, index) => ({ '#': index + 1, 'Edge Case': text }))),
    'Edge Cases',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    toSheet(
      testCases.map((tc) => ({
        ID: tc.id,
        Title: tc.title,
        Objective: tc.objective,
        Module: tc.module,
        Preconditions: tc.preconditions.join('; '),
        'Test Data': tc.testData,
        Steps: tc.steps.map((s) => `${s.step} -> ${s.expected}`).join(' | '),
        'Expected Result': tc.expectedResult,
        Priority: tc.priority,
        Severity: tc.severity,
        'Test Type': tc.testType,
        Classification: tc.classification,
        'Positive/Negative': tc.positiveOrNegative,
        Automatable: tc.automationCandidate ? 'Yes' : 'No',
        Tags: tc.tags.join(', '),
      })),
    ),
    'Test Cases',
  );

  XLSX.utils.book_append_sheet(
    workbook,
    toSheet([
      { Metric: 'Requirement Coverage %', Value: coverage.requirementCoveragePct },
      { Metric: 'Business Rule Coverage %', Value: coverage.businessRuleCoveragePct },
      { Metric: 'Acceptance Criteria Coverage %', Value: coverage.acceptanceCriteriaCoveragePct },
      { Metric: 'Validation Coverage %', Value: coverage.validationCoveragePct },
      { Metric: 'Edge Case Coverage %', Value: coverage.edgeCaseCoveragePct },
      { Metric: 'Risk Coverage %', Value: coverage.riskCoveragePct },
      { Metric: 'Overall %', Value: coverage.overallPct },
      ...coverage.uncovered.map((text) => ({ Metric: 'Uncovered', Value: text })),
    ]),
    'Coverage',
  );

  XLSX.writeFile(workbook, `requirement-analysis-${report.storyId}-v${report.version}.xlsx`);
}
