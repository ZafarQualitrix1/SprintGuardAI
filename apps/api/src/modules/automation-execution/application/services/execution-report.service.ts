import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { AutomationExecutionRunEntity } from '../../domain/entities/automation-execution-run.entity';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function htmlEscape(value: string): string {
  return xmlEscape(value);
}

// Reports (§Reports): HTML and JSON already exist (the GitHub Actions artifact URL and the run's
// own JSON representation, respectively -- both served without a new backend route). Excel/Extent/
// JUnit are all generated here, server-side, directly from the already-persisted testResults/
// totalTests/etc. on the run row -- not from re-parsing Playwright's own native report output,
// which would require the GitHub Actions workflow to additionally upload a JUnit artifact and
// thread its raw content back through the callback for no real benefit, since every field these
// three formats need is already captured in AutomationExecutionRun.
@Injectable()
export class ExecutionReportService {
  buildJunitXml(run: AutomationExecutionRunEntity): string {
    const total = run.totalTests ?? run.testResults.length;
    const failures = run.failedTests ?? run.testResults.filter((t) => t.status === 'FAILED').length;
    const skipped = run.skippedTests ?? run.testResults.filter((t) => t.status === 'SKIPPED').length;
    const timeSeconds = run.testResults.reduce((sum, t) => sum + t.durationMs, 0) / 1000;

    const testCases = run.testResults
      .map((t) => {
        const attrs = `name="${xmlEscape(t.title)}" classname="${xmlEscape(run.automationType)}Automation" time="${(t.durationMs / 1000).toFixed(3)}"`;
        if (t.status === 'FAILED') {
          return `    <testcase ${attrs}>\n      <failure message="${xmlEscape(t.error ?? 'Test failed')}">${xmlEscape(t.error ?? '')}</failure>\n    </testcase>`;
        }
        if (t.status === 'SKIPPED') {
          return `    <testcase ${attrs}>\n      <skipped/>\n    </testcase>`;
        }
        return `    <testcase ${attrs}/>`;
      })
      .join('\n');

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<testsuites name="SprintGuard AI Automation" tests="${total}" failures="${failures}" skipped="${skipped}" time="${timeSeconds.toFixed(3)}">`,
      `  <testsuite name="${xmlEscape(run.automationType)} Automation - ${xmlEscape(run.environment)}" tests="${total}" failures="${failures}" skipped="${skipped}" time="${timeSeconds.toFixed(3)}">`,
      testCases,
      '  </testsuite>',
      '</testsuites>',
    ].join('\n');
  }

  buildExcelWorkbook(run: AutomationExecutionRunEntity): Buffer {
    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet([
      { Field: 'Run ID', Value: run.id },
      { Field: 'Automation Type', Value: run.automationType },
      { Field: 'Environment', Value: run.environment },
      { Field: 'Browser', Value: run.browser ?? 'N/A' },
      { Field: 'Status', Value: run.status },
      { Field: 'Total Tests', Value: run.totalTests ?? 0 },
      { Field: 'Passed', Value: run.passedTests ?? 0 },
      { Field: 'Failed', Value: run.failedTests ?? 0 },
      { Field: 'Skipped', Value: run.skippedTests ?? 0 },
      { Field: 'Started At', Value: run.startedAt?.toISOString() ?? '' },
      { Field: 'Completed At', Value: run.completedAt?.toISOString() ?? '' },
      { Field: 'GitHub Run URL', Value: run.githubRunUrl ?? '' },
    ]);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    const resultsSheet = XLSX.utils.json_to_sheet(
      run.testResults.map((t) => ({
        Test: t.title,
        Status: t.status,
        'Duration (ms)': t.durationMs,
        Error: t.error ?? '',
      })),
    );
    XLSX.utils.book_append_sheet(workbook, resultsSheet, 'Test Results');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // Hand-built HTML report modeled after Extent Report's look (pass/fail dashboard + a per-test
  // table) -- no Playwright/TypeScript library produces a literal Extent Report, so this is a
  // self-contained static file (inline CSS, no external assets) rather than an integrated library.
  buildExtentStyleHtmlReport(run: AutomationExecutionRunEntity): string {
    const total = run.totalTests ?? run.testResults.length;
    const passed = run.passedTests ?? 0;
    const failed = run.failedTests ?? 0;
    const skipped = run.skippedTests ?? 0;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

    const rows = run.testResults
      .map((t) => {
        const statusColor = t.status === 'PASSED' ? '#16a34a' : t.status === 'FAILED' ? '#dc2626' : '#ca8a04';
        return `<tr>
          <td>${htmlEscape(t.title)}</td>
          <td><span style="color:${statusColor};font-weight:600">${t.status}</span></td>
          <td>${(t.durationMs / 1000).toFixed(2)}s</td>
          <td>${t.error ? htmlEscape(t.error) : ''}</td>
        </tr>`;
      })
      .join('\n');

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>SprintGuard AI Automation Report</title>
<style>
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #e2e8f0; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #94a3b8; font-size: 13px; margin-bottom: 24px; }
  .dashboard { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
  .card { background: #1e293b; border-radius: 8px; padding: 16px 24px; min-width: 120px; }
  .card .label { font-size: 12px; color: #94a3b8; text-transform: uppercase; }
  .card .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
  .pass { color: #16a34a; } .fail { color: #dc2626; } .skip { color: #ca8a04; }
  table { width: 100%; border-collapse: collapse; background: #1e293b; border-radius: 8px; overflow: hidden; }
  th, td { text-align: left; padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #334155; }
  th { background: #0f172a; color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 11px; }
  tr:last-child td { border-bottom: none; }
</style>
</head>
<body>
  <h1>SprintGuard AI Automation Report</h1>
  <p class="meta">${htmlEscape(run.automationType)} automation &middot; ${htmlEscape(run.environment)}${run.browser ? ` &middot; ${htmlEscape(run.browser)}` : ''} &middot; Run ${htmlEscape(run.id)}</p>

  <div class="dashboard">
    <div class="card"><div class="label">Total</div><div class="value">${total}</div></div>
    <div class="card"><div class="label">Passed</div><div class="value pass">${passed}</div></div>
    <div class="card"><div class="label">Failed</div><div class="value fail">${failed}</div></div>
    <div class="card"><div class="label">Skipped</div><div class="value skip">${skipped}</div></div>
    <div class="card"><div class="label">Pass Rate</div><div class="value">${passRate}%</div></div>
  </div>

  <table>
    <thead><tr><th>Test</th><th>Status</th><th>Duration</th><th>Error</th></tr></thead>
    <tbody>
      ${rows || '<tr><td colspan="4">No test results recorded.</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;
  }
}
