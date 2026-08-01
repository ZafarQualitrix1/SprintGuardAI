'use client';

import { useMemo, useState } from 'react';
import type { RequirementAnalysisReport } from '@sprintguard/shared';
import { Copy, Download, FileSpreadsheet, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  useGenerateRequirementAnalysis,
  useRequirementAnalysisHistory,
} from '@/features/requirement-intelligence/api';
import { CollapsibleSection, StringList } from './collapsible-section';
import { TestCaseTable } from './test-case-table';
import { exportAnalysisReportToJson, exportTestCasesToCsv } from '../lib/export-json-csv';
import { exportAnalysisReportToPdf } from '../lib/export-pdf';
import { exportAnalysisReportToExcel } from '../lib/export-excel';

function coverageTone(pct: number): string {
  if (pct >= 80) return 'text-success';
  if (pct >= 50) return 'text-warning';
  return 'text-destructive';
}

interface StoryAnalysisReportProps {
  storyId: string;
  storyTitle: string;
  report: RequirementAnalysisReport;
}

export function StoryAnalysisReport({ storyId, storyTitle, report: latest }: StoryAnalysisReportProps) {
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const historyEnabled = latest.version > 1;
  const { data: history } = useRequirementAnalysisHistory(storyId, historyEnabled);
  const generate = useGenerateRequirementAnalysis(storyId);

  const report = useMemo(() => {
    if (selectedVersion === null || !history) return latest;
    return history.find((r) => r.version === selectedVersion) ?? latest;
  }, [selectedVersion, history, latest]);

  const { analysis, testCases, coverage } = report;

  const onRegenerate = () =>
    generate.mutate(undefined, {
      onSuccess: () => {
        setSelectedVersion(null);
        toast({ title: 'Analysis regenerated', description: `${storyTitle} — v${report.version + 1}` });
      },
      onError: (error) => toast({ variant: 'destructive', title: 'Regenerate failed', description: String(error) }),
    });

  const onCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    toast({ title: 'Copied analysis JSON to clipboard' });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            {report.aiProvider}/{report.model} · v{report.version}
            {report.isLatest ? '' : ' (older)'} · {new Date(report.createdAt).toLocaleString()}
          </span>
          {history && history.length > 1 ? (
            <Select
              value={String(selectedVersion ?? latest.version)}
              onValueChange={(v) => setSelectedVersion(Number(v) === latest.version ? null : Number(v))}
            >
              <SelectTrigger className="h-7 w-28 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {history.map((r) => (
                  <SelectItem key={r.id} value={String(r.version)}>
                    v{r.version}{r.isLatest ? ' (latest)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={onCopy}>
            <Copy className="mr-1.5 h-3.5 w-3.5" /> Copy
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAnalysisReportToJson(report)}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportTestCasesToCsv(report)}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAnalysisReportToPdf(storyTitle, report)}>
            <FileText className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAnalysisReportToExcel(report)}>
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Excel
          </Button>
          <Button size="sm" onClick={onRegenerate} disabled={generate.isPending}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> {generate.isPending ? 'Regenerating…' : 'Regenerate'}
          </Button>
        </div>
      </div>

      <div className="rounded-md border p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium">Overall Coverage</p>
          <p className={`text-lg font-semibold ${coverageTone(coverage.overallPct)}`}>{coverage.overallPct}%</p>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3">
          <span>Requirement: {coverage.requirementCoveragePct}%</span>
          <span>Business Rule: {coverage.businessRuleCoveragePct}%</span>
          <span>Acceptance Criteria: {coverage.acceptanceCriteriaCoveragePct}%</span>
          <span>Validation: {coverage.validationCoveragePct}%</span>
          <span>Edge Case: {coverage.edgeCaseCoveragePct}%</span>
          <span>Risk: {coverage.riskCoveragePct}%</span>
        </div>
        {coverage.uncovered.length > 0 ? (
          <div className="mt-2 border-t pt-2">
            <p className="mb-1 text-xs font-medium">Uncovered</p>
            <StringList items={coverage.uncovered} />
          </div>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">{analysis.summary}</p>

      <div className="space-y-2">
        <CollapsibleSection title="Functional Requirements" count={analysis.functionalRequirements.length} defaultOpen>
          <StringList items={analysis.functionalRequirements} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Non-Functional Requirements"
          count={Object.values(analysis.nonFunctionalRequirements).flat().length}
        >
          {Object.entries(analysis.nonFunctionalRequirements).map(([key, items]) =>
            items.length > 0 ? (
              <div key={key}>
                <p className="mb-1 text-xs font-medium capitalize">{key}</p>
                <StringList items={items} />
              </div>
            ) : null,
          )}
        </CollapsibleSection>

        <CollapsibleSection
          title="Acceptance Criteria Analysis"
          count={
            analysis.acceptanceCriteriaAnalysis.rewritten.length +
            analysis.acceptanceCriteriaAnalysis.missing.length +
            analysis.acceptanceCriteriaAnalysis.ambiguous.length +
            analysis.acceptanceCriteriaAnalysis.conflicting.length
          }
        >
          <p className="mb-1 text-xs font-medium">Rewritten</p>
          <StringList items={analysis.acceptanceCriteriaAnalysis.rewritten} />
          <p className="mb-1 mt-2 text-xs font-medium">Missing</p>
          <StringList items={analysis.acceptanceCriteriaAnalysis.missing} />
          <p className="mb-1 mt-2 text-xs font-medium">Ambiguous</p>
          <StringList items={analysis.acceptanceCriteriaAnalysis.ambiguous} />
          <p className="mb-1 mt-2 text-xs font-medium">Conflicting</p>
          <StringList items={analysis.acceptanceCriteriaAnalysis.conflicting} />
        </CollapsibleSection>

        <CollapsibleSection title="Business Rules" count={analysis.businessRules.length}>
          <StringList items={analysis.businessRules} />
        </CollapsibleSection>

        <CollapsibleSection title="Assumptions" count={analysis.assumptions.length}>
          <StringList items={analysis.assumptions} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Dependencies"
          count={analysis.dependencies.internal.length + analysis.dependencies.external.length}
        >
          <p className="mb-1 text-xs font-medium">Internal</p>
          <StringList items={analysis.dependencies.internal} />
          <p className="mb-1 mt-2 text-xs font-medium">External</p>
          <StringList items={analysis.dependencies.external} />
        </CollapsibleSection>

        <CollapsibleSection title="Risks" count={Object.values(analysis.risks).flat().length}>
          {Object.entries(analysis.risks).map(([key, items]) =>
            items.length > 0 ? (
              <div key={key}>
                <p className="mb-1 text-xs font-medium capitalize">{key}</p>
                <StringList items={items} />
              </div>
            ) : null,
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Edge Cases" count={analysis.edgeCases.length}>
          <StringList items={analysis.edgeCases} />
        </CollapsibleSection>

        <CollapsibleSection title="Negative Scenarios" count={analysis.negativeScenarios.length}>
          <StringList items={analysis.negativeScenarios} />
        </CollapsibleSection>

        <CollapsibleSection title="Validation Rules" count={analysis.validationRules.length}>
          <StringList items={analysis.validationRules} />
        </CollapsibleSection>

        <CollapsibleSection
          title="Missing Requirements"
          count={Object.values(analysis.missingRequirements).flat().length}
        >
          {Object.entries(analysis.missingRequirements).map(([key, items]) =>
            items.length > 0 ? (
              <div key={key}>
                <p className="mb-1 text-xs font-medium capitalize">{key}</p>
                <StringList items={items} />
              </div>
            ) : null,
          )}
        </CollapsibleSection>

        <CollapsibleSection title="API Impact" count={analysis.apiImpact.length}>
          <StringList items={analysis.apiImpact} emptyLabel="No API impact identified" />
        </CollapsibleSection>

        <CollapsibleSection title="Database Impact" count={analysis.databaseImpact.length}>
          <StringList items={analysis.databaseImpact} emptyLabel="No database impact identified" />
        </CollapsibleSection>

        <CollapsibleSection title="UI Impact" count={analysis.uiImpact.length}>
          <StringList items={analysis.uiImpact} emptyLabel="No UI impact identified" />
        </CollapsibleSection>

        <CollapsibleSection
          title="Automation Feasibility"
          count={Object.values(analysis.automationFeasibility).flat().length}
        >
          {Object.entries(analysis.automationFeasibility).map(([key, items]) =>
            items.length > 0 ? (
              <div key={key}>
                <p className="mb-1 text-xs font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                <StringList items={items} />
              </div>
            ) : null,
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Test Strategy" count={Object.values(analysis.testStrategy).flat().length}>
          {Object.entries(analysis.testStrategy).map(([key, items]) =>
            items.length > 0 ? (
              <div key={key}>
                <p className="mb-1 text-xs font-medium capitalize">{key}</p>
                <StringList items={items} />
              </div>
            ) : null,
          )}
        </CollapsibleSection>

        <CollapsibleSection title="Test Cases" count={testCases.length} defaultOpen>
          <TestCaseTable testCases={testCases} />
        </CollapsibleSection>
      </div>

      <div className="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
        <span>
          Confidence:{' '}
          {report.confidenceScore !== null ? (
            <Badge variant={report.confidenceScore >= 0.9 ? 'success' : 'warning'}>
              {Math.round(report.confidenceScore * 100)}%
            </Badge>
          ) : (
            'N/A'
          )}
        </span>
      </div>
    </div>
  );
}
