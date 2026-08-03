import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { TestCaseDistribution, TestCaseSnapshotEntry } from '../../domain/entities/ba-review-cycle.entity';

export interface BuildTestCaseWorkbookInput {
  storyExternalId: string;
  storyTitle: string;
  sprintName: string;
  documentVersionLabel: string;
  testCasesSnapshot: TestCaseSnapshotEntry[];
  distribution: TestCaseDistribution;
  totalTestCases: number;
  coveragePercent: number | null;
  automationReadinessPercent: number | null;
  aiModelVersion: string;
  promptVersion: string;
  generatedAt: Date;
}

function toSheet(rows: Record<string, unknown>[]) {
  return XLSX.utils.json_to_sheet(rows);
}

// Server-side Excel generation (BA Review Workflow's Jira attachment) -- deliberately Excel-only,
// not PDF, to avoid adding a heavy Node PDF-rendering dependency for one attachment type. Mirrors
// the field/sheet conventions of the frontend's export-excel.ts (Requirement Intelligence), but
// produces a Buffer (XLSX.write) instead of triggering a browser download (XLSX.writeFile).
@Injectable()
export class DocumentBuilderService {
  buildTestCaseWorkbook(input: BuildTestCaseWorkbookInput): Buffer {
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      toSheet([
        { Field: 'User Story', Value: `${input.storyExternalId} - ${input.storyTitle}` },
        { Field: 'Sprint', Value: input.sprintName },
        { Field: 'Document Version', Value: input.documentVersionLabel },
        { Field: 'Total Test Cases Generated', Value: input.totalTestCases },
        { Field: 'Requirement Coverage %', Value: input.coveragePercent ?? 'N/A' },
        { Field: 'Automation Readiness %', Value: input.automationReadinessPercent ?? 'N/A' },
        { Field: 'AI Generation Timestamp', Value: input.generatedAt.toISOString() },
        { Field: 'AI Model Version', Value: input.aiModelVersion },
        { Field: 'Prompt Version', Value: input.promptVersion },
      ]),
      'Summary',
    );

    XLSX.utils.book_append_sheet(
      workbook,
      toSheet(
        (Object.entries(input.distribution) as [string, number][])
          .filter(([, count]) => count > 0)
          .map(([testType, count]) => ({ 'Test Type': testType, Count: count })),
      ),
      'Distribution',
    );

    // Column set intentionally scoped to what's already in the frozen snapshot -- this workbook is
    // the compact, auto-attached Jira document. Story/Execution-joined fields (Feature Name,
    // Actual Result/Status) belong to the fuller, user-triggered export endpoint instead.
    const caseRows: Record<string, unknown>[] = [];
    for (const scenario of input.testCasesSnapshot) {
      for (const testCase of scenario.testCases) {
        caseRows.push({
          Scenario: scenario.scenarioTitle,
          'Test Case ID': testCase.displayId ?? testCase.id,
          Title: testCase.title,
          'Test Objective': testCase.testObjective ?? '',
          Description: testCase.description ?? '',
          Preconditions: (testCase.preconditions ?? []).join(' | '),
          Dependencies: testCase.dependencies ?? '',
          Steps: testCase.steps.map((step) => step.step).join(' | '),
          'Expected Results': testCase.steps.map((step) => step.expected).join(' | '),
          'Request Method': testCase.requestMethod ?? '',
          'Request Payload': testCase.requestPayload ? JSON.stringify(testCase.requestPayload) : '',
          'Expected Status Code': testCase.expectedStatusCode ?? '',
          'Expected Response': testCase.expectedResponse ?? '',
          Priority: testCase.priority,
          Severity: testCase.severity,
          'Test Type': testCase.testType,
          'Automation Status': testCase.automationStatus,
          Remarks: testCase.remarks ?? '',
        });
      }
    }
    XLSX.utils.book_append_sheet(workbook, toSheet(caseRows), 'Test Cases');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
