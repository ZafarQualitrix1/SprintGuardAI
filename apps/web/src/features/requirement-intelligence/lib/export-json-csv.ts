import type { RequirementAnalysisReport } from '@sprintguard/shared';

function download(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportAnalysisReportToJson(report: RequirementAnalysisReport): void {
  download(
    `requirement-analysis-${report.storyId}-v${report.version}.json`,
    JSON.stringify(report, null, 2),
    'application/json',
  );
}

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportTestCasesToCsv(report: RequirementAnalysisReport): void {
  const headers = [
    'ID', 'Title', 'Objective', 'Module', 'Preconditions', 'Test Data', 'Steps', 'Expected Result',
    'Priority', 'Severity', 'Test Type', 'Classification', 'Positive/Negative', 'Automatable', 'Tags',
  ];
  const rows = report.testCases.map((tc) => [
    tc.id,
    tc.title,
    tc.objective,
    tc.module,
    tc.preconditions.join('; '),
    tc.testData,
    tc.steps.map((s) => `${s.step} -> ${s.expected}`).join(' | '),
    tc.expectedResult,
    tc.priority,
    tc.severity,
    tc.testType,
    tc.classification,
    tc.positiveOrNegative,
    tc.automationCandidate ? 'Yes' : 'No',
    tc.tags.join(', '),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
  download(`requirement-analysis-test-cases-${report.storyId}-v${report.version}.csv`, csv, 'text/csv');
}
