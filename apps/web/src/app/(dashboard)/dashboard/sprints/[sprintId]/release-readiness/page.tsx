'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Gauge, Settings2, ShieldAlert, Sparkles } from 'lucide-react';
import type { ReleaseGateStatus, ReleaseRiskCategory } from '@sprintguard/shared';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge, BadgeProps } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  useComputeReleaseReadiness,
  useReleaseReadinessRealtime,
  useReleaseReport,
  useReleaseReportHistory,
  useReleaseScoringConfig,
} from '@/features/release/api';
import { ReleaseGatesCard } from '@/features/release/components/release-gates-card';
import { ScoringConfigDialog } from '@/features/release/components/scoring-config-dialog';
import { BugSeverityPieChart } from '@/features/release/components/bug-severity-pie-chart';
import { RequirementCompletionRing } from '@/features/release/components/requirement-completion-ring';
import { PassFailTrendChart } from '@/features/release/components/pass-fail-trend-chart';
import { AutomationTrendChart } from '@/features/release/components/automation-trend-chart';
import { CoverageTrendHeatmap } from '@/features/release/components/coverage-trend-heatmap';
import { DefectBurndownChart } from '@/features/release/components/defect-burndown-chart';
import { AiRecommendationPanel } from '@/features/release/components/ai-recommendation-panel';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

const RISK_CATEGORY_LABEL: Record<ReleaseRiskCategory, string> = {
  PRODUCTION_READY: 'Production Ready',
  LOW_RISK: 'Low Risk',
  MEDIUM_RISK: 'Medium Risk',
  HIGH_RISK: 'High Risk',
  NOT_RECOMMENDED: 'Release Not Recommended',
};

const RISK_CATEGORY_VARIANT: Record<ReleaseRiskCategory, BadgeProps['variant']> = {
  PRODUCTION_READY: 'success',
  LOW_RISK: 'success',
  MEDIUM_RISK: 'warning',
  HIGH_RISK: 'destructive',
  NOT_RECOMMENDED: 'destructive',
};

const RELEASE_STATUS_LABEL: Record<ReleaseGateStatus, string> = {
  BLOCKED: 'Blocked',
  NEEDS_PM_APPROVAL: 'Needs PM Approval',
  CONDITIONAL_APPROVAL: 'Conditional Approval',
  APPROVED: 'Approved',
};

const RELEASE_STATUS_VARIANT: Record<ReleaseGateStatus, BadgeProps['variant']> = {
  BLOCKED: 'destructive',
  NEEDS_PM_APPROVAL: 'warning',
  CONDITIONAL_APPROVAL: 'warning',
  APPROVED: 'success',
};

export default function ReleaseReadinessPage() {
  const params = useParams<{ sprintId: string }>();
  const sprintId = params.sprintId;
  const { data: report, isLoading } = useReleaseReport(sprintId);
  const { data: history } = useReleaseReportHistory(sprintId);
  const { data: scoringConfig } = useReleaseScoringConfig(sprintId);
  const compute = useComputeReleaseReadiness(sprintId);
  const [configOpen, setConfigOpen] = useState(false);
  useReleaseReadinessRealtime(sprintId);

  return (
    <div>
      <PageHeader
        title="Release Readiness"
        description="AI-computed readiness score, mandatory release gates, and executive summary."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfigOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Configure scoring
            </Button>
            <Button
              onClick={() =>
                compute.mutate(undefined, {
                  onSuccess: (result) =>
                    toast({ title: 'Release readiness computed', description: `Score: ${result.readinessScore}/100` }),
                  onError: (error) =>
                    toast({
                      variant: 'destructive',
                      title: 'Could not compute release readiness',
                      description: error instanceof ApiError ? error.message : undefined,
                    }),
                })
              }
              disabled={compute.isPending}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {compute.isPending ? 'Computing…' : 'Compute readiness'}
            </Button>
          </div>
        }
      />

      {compute.isError ? (
        <p className="mb-4 text-sm text-destructive">
          {compute.error instanceof ApiError ? compute.error.message : 'Could not compute release readiness.'}
        </p>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !report ? (
        <EmptyState
          icon={Gauge}
          title="Release readiness not computed yet"
          description="Compute coverage and record test executions for this sprint, then compute release readiness."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Readiness score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{report.readinessScore}/100</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Deployment probability</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">{report.breakdown.deploymentProbability}%</p>
                <p className="text-xs text-muted-foreground">{report.breakdown.deploymentLabel}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Risk level</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={RISK_CATEGORY_VARIANT[report.breakdown.riskCategory]}>
                  {RISK_CATEGORY_LABEL[report.breakdown.riskCategory]}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Release status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant={RELEASE_STATUS_VARIANT[report.breakdown.releaseStatus]}>
                  {RELEASE_STATUS_LABEL[report.breakdown.releaseStatus]}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {report.breakdown.mandatoryFlags.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Mandatory rule flags</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {report.breakdown.mandatoryFlags.map((flag) => (
                  <div
                    key={flag.rule}
                    className={cn(
                      'flex items-start gap-2 rounded-md border px-3 py-2 text-sm',
                      flag.severity === 'BLOCK'
                        ? 'border-destructive/40 bg-destructive/10 text-destructive'
                        : 'border-warning/40 bg-warning/10 text-warning',
                    )}
                  >
                    {flag.severity === 'BLOCK' ? (
                      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <span>{flag.message}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Requirement coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.breakdown.requirementCoveragePercent}%</p>
                <p className="text-xs text-muted-foreground">
                  {report.breakdown.coveredRequirements}/{report.breakdown.totalRequirements} requirements
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Test case coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.breakdown.testCaseCoveragePercent}%</p>
                <p className="text-xs text-muted-foreground">
                  {report.breakdown.approvedTestCases}/{report.breakdown.totalTestCases} approved
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Manual pass rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.breakdown.manualPassRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {report.breakdown.manualPassedCount}/{report.breakdown.manualExecutedCount} passed
                  {report.breakdown.manualPendingCount > 0 ? `, ${report.breakdown.manualPendingCount} pending` : ''}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Automation pass rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.breakdown.automationPassRate}%</p>
                <p className="text-xs text-muted-foreground">
                  {report.breakdown.automationPassedCount}/{report.breakdown.automationExecutedCount} passed
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Bug severity distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <BugSeverityPieChart openCounts={report.breakdown.bugRisk.openCounts} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Requirement completion</CardTitle>
              </CardHeader>
              <CardContent>
                <RequirementCompletionRing
                  percent={report.breakdown.requirementCoveragePercent}
                  covered={report.breakdown.coveredRequirements}
                  total={report.breakdown.totalRequirements}
                />
              </CardContent>
            </Card>
            <AiRecommendationPanel recommendations={report.breakdown.recommendations} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pass/fail trend</CardTitle>
              </CardHeader>
              <CardContent>
                <PassFailTrendChart history={history ?? []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Automation trend</CardTitle>
              </CardHeader>
              <CardContent>
                <AutomationTrendChart history={history ?? []} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Coverage trend</CardTitle>
              </CardHeader>
              <CardContent>
                <CoverageTrendHeatmap history={history ?? []} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Open defects timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <DefectBurndownChart history={history ?? []} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Open bug risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3 grid grid-cols-4 gap-2 text-center sm:grid-cols-7">
                  {Object.entries(report.breakdown.bugRisk.openCounts).map(([severity, count]) => (
                    <div key={severity} className="rounded-md border px-2 py-1.5">
                      <p className="text-lg font-semibold">{count}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{severity}</p>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Total deduction:{' '}
                  <span className="font-medium text-foreground">{report.breakdown.bugRisk.totalDeduction}</span> pts
                </p>
              </CardContent>
            </Card>

            <ReleaseGatesCard sprintId={sprintId} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Executive summary</CardTitle>
            </CardHeader>
            <CardContent>
              {report.executiveSummary ? (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{report.executiveSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No summary is available for this computation.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {scoringConfig ? (
        <ScoringConfigDialog sprintId={sprintId} config={scoringConfig} open={configOpen} onOpenChange={setConfigOpen} />
      ) : null}
    </div>
  );
}
