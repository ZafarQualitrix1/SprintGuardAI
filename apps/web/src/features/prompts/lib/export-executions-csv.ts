import type { PromptExecutionRow } from '@sprintguard/shared';

function csvEscape(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function exportExecutionsToCsv(rows: PromptExecutionRow[]): void {
  const headers = [
    'Timestamp', 'AI Agent', 'Prompt Version', 'Provider', 'Model', 'Status', 'Execution Time (ms)',
    'Total Tokens', 'Est. Cost', 'Confidence', 'Failure Reason', 'Correlation ID',
  ];
  const csvRows = rows.map((row) => [
    row.timestamp,
    row.capability,
    row.promptVersion ?? '',
    row.provider,
    row.model,
    row.status,
    row.latencyMs ?? '',
    row.totalTokens ?? '',
    row.costUsd ?? '',
    row.confidenceScore ?? '',
    row.failureReason ?? '',
    row.correlationId,
  ]);
  const csv = [headers, ...csvRows].map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `prompt-executions-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
