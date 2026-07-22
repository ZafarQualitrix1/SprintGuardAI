'use client';

import { useParams } from 'next/navigation';
import { Gauge, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useComputeReleaseReadiness, useReleaseReport } from '@/features/release/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

function readinessVariant(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'destructive';
}

export default function ReleaseReadinessPage() {
  const params = useParams<{ sprintId: string }>();
  const { data: report, isLoading } = useReleaseReport(params.sprintId);
  const compute = useComputeReleaseReadiness(params.sprintId);

  return (
    <div>
      <PageHeader
        title="Release Readiness"
        description="AI-computed readiness score and executive summary."
        actions={
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">Readiness score</CardTitle>
              <Badge variant={readinessVariant(report.readinessScore)}>{report.status}</Badge>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-semibold">{report.readinessScore}/100</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.breakdown.coveragePercent}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Execution pass rate</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.breakdown.executionPassRate}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Passed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {report.breakdown.passedCount}/{report.breakdown.totalTestCases}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{report.breakdown.failedCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Executive summary</CardTitle>
            </CardHeader>
            <CardContent>
              {report.executiveSummary ? (
                <p className="whitespace-pre-line text-sm text-muted-foreground">{report.executiveSummary}</p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No AI-generated summary is available for this computation.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
