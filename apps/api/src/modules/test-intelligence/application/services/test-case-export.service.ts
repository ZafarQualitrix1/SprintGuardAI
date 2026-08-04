import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { TestScenarioEntity } from '../../domain/entities/test-artifact.entity';
import { StoryMetadataReadModel } from '../../domain/repositories/story-metadata-read.repository.interface';

export type TestCaseExportFormat = 'xlsx' | 'csv';

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CASE_COLUMNS: { header: string; value: (scenario: TestScenarioEntity, tc: TestScenarioEntity['testCases'][number]) => unknown }[] = [
  { header: 'Test Case ID', value: (_s, tc) => tc.displayId ?? tc.id },
  { header: 'Scenario', value: (s) => s.title },
  { header: 'Title', value: (_s, tc) => tc.title },
  { header: 'Test Objective', value: (_s, tc) => tc.testObjective ?? '' },
  { header: 'Description', value: (_s, tc) => tc.description ?? '' },
  { header: 'Preconditions', value: (_s, tc) => (tc.preconditions ?? []).join(' | ') },
  { header: 'Dependencies', value: (_s, tc) => tc.dependencies ?? '' },
  { header: 'Step Number', value: (_s, tc) => tc.steps.map((_step, i) => i + 1).join(' | ') },
  { header: 'Steps', value: (_s, tc) => tc.steps.map((step) => step.step).join(' | ') },
  { header: 'Expected Results', value: (_s, tc) => tc.steps.map((step) => step.expected).join(' | ') },
  { header: 'Request Method', value: (_s, tc) => tc.requestMethod ?? '' },
  { header: 'Request Payload', value: (_s, tc) => (tc.requestPayload ? JSON.stringify(tc.requestPayload) : '') },
  { header: 'Expected Status Code', value: (_s, tc) => tc.expectedStatusCode ?? '' },
  { header: 'Expected Response', value: (_s, tc) => tc.expectedResponse ?? '' },
  { header: 'Priority', value: (_s, tc) => tc.priority },
  { header: 'Severity', value: (_s, tc) => tc.severity },
  { header: 'Test Type', value: (_s, tc) => tc.testType },
  { header: 'Module', value: (_s, tc) => tc.module ?? '' },
  { header: 'Automation Status', value: (_s, tc) => tc.automationStatus },
  { header: 'Automation Type', value: (_s, tc) => tc.automationType },
  { header: 'Tags', value: (_s, tc) => tc.tags.join(', ') },
  { header: 'Remarks', value: (_s, tc) => tc.remarks ?? '' },
];

// User-facing Test Generation export (Excel/CSV) -- distinct from DocumentBuilderService's
// buildTestCaseWorkbook, which builds the compact, auto-attached Jira document from a frozen
// BaReviewCycle snapshot. This one exports live TestScenario/TestCase data on demand, with the
// full enterprise field set (Feature Name/Actual Result/Status are deliberately still out of scope
// here -- see the export controller route's doc comment for why).
@Injectable()
export class TestCaseExportService {
  buildWorkbook(scenarios: TestScenarioEntity[], story: StoryMetadataReadModel): Buffer {
    const workbook = XLSX.utils.book_new();
    const totalCases = scenarios.reduce((sum, s) => sum + s.testCases.length, 0);

    const summarySheet = XLSX.utils.json_to_sheet([
      { Field: 'User Story', Value: story.externalId ? `${story.externalId} - ${story.title}` : story.title },
      { Field: 'Total Scenarios', Value: scenarios.length },
      { Field: 'Total Test Cases', Value: totalCases },
      { Field: 'Exported At', Value: new Date().toISOString() },
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const rows = this.buildRows(scenarios);
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, sheet, 'Test Cases');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  buildCsv(scenarios: TestScenarioEntity[]): string {
    const rows = this.buildRows(scenarios);
    const headers = CASE_COLUMNS.map((c) => c.header);
    const lines = rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','));
    return [headers.join(','), ...lines].join('\n');
  }

  private buildRows(scenarios: TestScenarioEntity[]): Record<string, unknown>[] {
    const rows: Record<string, unknown>[] = [];
    for (const scenario of scenarios) {
      for (const testCase of scenario.testCases) {
        const row: Record<string, unknown> = {};
        for (const column of CASE_COLUMNS) {
          row[column.header] = column.value(scenario, testCase);
        }
        rows.push(row);
      }
    }
    return rows;
  }
}
