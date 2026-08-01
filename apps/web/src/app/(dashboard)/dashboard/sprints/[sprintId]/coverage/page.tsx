'use client';

import { useParams } from 'next/navigation';
import { AlertCircle, FileQuestion, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useComputeCoverage, useCoverage } from '@/features/coverage/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

function coverageStatusVariant(status: string): 'success' | 'warning' | 'destructive' {
  if (status === 'COVERED') return 'success';
  if (status === 'PARTIALLY_COVERED') return 'warning';
  return 'destructive';
}

function coverageStatusLabel(status: string): string {
  if (status === 'COVERED') return 'Covered';
  if (status === 'PARTIALLY_COVERED') return 'Partial';
  return 'Not covered';
}

function gapSeverityVariant(severity: string): 'secondary' | 'warning' | 'destructive' {
  if (severity === 'LOW') return 'secondary';
  if (severity === 'MEDIUM') return 'warning';
  return 'destructive';
}

export default function CoveragePage() {
  const params = useParams<{ sprintId: string }>();
  const { data: coverage, isLoading } = useCoverage(params.sprintId);
  const compute = useComputeCoverage(params.sprintId);

  return (
    <div>
      <PageHeader
        title="Test Coverage"
        description="Requirement coverage computed from acceptance criteria, test scenarios, and test cases."
        actions={
          <Button
            onClick={() =>
              compute.mutate(undefined, {
                onSuccess: (result) =>
                  toast({
                    title: 'Coverage computed',
                    description: `${result.summary.coveragePercent}% covered (${result.summary.coveredCount}/${result.summary.totalRequirements} requirements)`,
                  }),
                onError: (error) =>
                  toast({
                    variant: 'destructive',
                    title: 'Could not compute coverage',
                    description: error instanceof ApiError ? error.message : undefined,
                  }),
              })
            }
            disabled={compute.isPending}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {compute.isPending ? 'Computing…' : 'Compute coverage'}
          </Button>
        }
      />

      {compute.isError ? (
        <p className="mb-4 text-sm text-destructive">
          {compute.error instanceof ApiError ? compute.error.message : 'Could not compute coverage.'}
        </p>
      ) : null}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : !coverage ? (
        <EmptyState
          icon={FileQuestion}
          title="Coverage not computed yet"
          description="Generate requirements and test cases for this sprint's stories, then compute coverage."
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Requirement coverage</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{coverage.summary.coveragePercent}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Covered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{coverage.summary.coveredCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Partially covered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{coverage.summary.partiallyCoveredCount}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">Not covered</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{coverage.summary.notCoveredCount}</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Requirement matrix</CardTitle>
            </CardHeader>
            <CardContent>
              {coverage.entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No requirements found for this sprint&apos;s stories.</p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {coverage.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-4 rounded-md border p-2">
                      <p className="truncate text-sm">{entry.requirementText}</p>
                      <Badge variant={coverageStatusVariant(entry.coverageStatus)}>
                        {coverageStatusLabel(entry.coverageStatus)}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                Gaps
              </CardTitle>
            </CardHeader>
            <CardContent>
              {coverage.gaps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No coverage gaps — every requirement is fully covered.</p>
              ) : (
                <div className="max-h-96 space-y-2 overflow-y-auto">
                  {coverage.gaps.map((gap) => (
                    <div key={gap.id} className="flex items-start justify-between gap-4 rounded-md border p-2">
                      <p className="text-sm text-muted-foreground">{gap.description}</p>
                      <Badge variant={gapSeverityVariant(gap.severity)}>{gap.severity}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              {!coverage.aiRecommendation ? (
                <p className="text-sm text-muted-foreground">
                  AI recommendations appear here right after you click &ldquo;Compute coverage&rdquo; — they
                  aren&apos;t saved, so reloading this page clears them.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm">
                    Quality score: <span className="font-semibold">{coverage.aiRecommendation.qualityScore}/100</span>
                  </p>
                  <p className="whitespace-pre-line text-sm text-muted-foreground">
                    {coverage.aiRecommendation.summary}
                  </p>
                  {coverage.aiRecommendation.missingScenarios.length > 0 ? (
                    <div className="space-y-2">
                      {coverage.aiRecommendation.missingScenarios.map((scenario, index) => (
                        <div key={index} className="rounded-md border p-2">
                          <p className="text-sm font-medium">{scenario.suggestedScenario}</p>
                          <p className="text-xs text-muted-foreground">For: {scenario.requirementText}</p>
                          <p className="text-xs text-muted-foreground">{scenario.reason}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
