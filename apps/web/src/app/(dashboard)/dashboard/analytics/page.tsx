'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FolderKanban, Rocket, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SummaryCard } from '@/features/analytics/components/summary-card';
import { VelocityTrendChart } from '@/features/analytics/components/velocity-trend-chart';
import { StoryStatusChart } from '@/features/analytics/components/story-status-chart';
import { ExecutionStatusChart } from '@/features/analytics/components/execution-status-chart';
import { useDashboardSummary } from '@/features/analytics/api';
import { useProjects, useSprint, useSprints } from '@/features/sprint/api';
import { useCoverage } from '@/features/coverage/api';
import { useReleaseReport } from '@/features/release/api';
import { useExecutions } from '@/features/execution/api';

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

function scoreVariant(score: number): 'success' | 'warning' | 'destructive' {
  if (score >= 80) return 'success';
  if (score >= 50) return 'warning';
  return 'destructive';
}

export default function AnalyticsPage() {
  const { data: summary, isLoading: isSummaryLoading } = useDashboardSummary();

  const { data: projects, isLoading: isProjectsLoading } = useProjects();
  const [projectId, setProjectId] = useState<string | undefined>();
  const activeProjectId = projectId ?? projects?.[0]?.id;

  const { data: sprints, isLoading: isSprintsLoading } = useSprints(activeProjectId);
  const [sprintId, setSprintId] = useState<string | undefined>();
  const activeSprintId = sprintId ?? sprints?.[0]?.id;

  // Reset the sprint choice when the project changes so a stale sprintId from the previous
  // project never gets used to fetch this project's sprint-scoped sections below.
  useEffect(() => {
    setSprintId(undefined);
  }, [activeProjectId]);

  const { data: sprint, isLoading: isSprintLoading } = useSprint(activeSprintId ?? '');
  const { data: coverage, isLoading: isCoverageLoading } = useCoverage(activeSprintId ?? '');
  const { data: releaseReport, isLoading: isReleaseLoading } = useReleaseReport(activeSprintId ?? '');
  const { data: executions, isLoading: isExecutionsLoading } = useExecutions(activeSprintId ?? '');

  const donePoints =
    sprint?.stories.filter((s) => s.status === 'DONE').reduce((sum, s) => sum + (s.storyPoints ?? 0), 0) ?? 0;
  const totalPoints = sprint?.stories.reduce((sum, s) => sum + (s.storyPoints ?? 0), 0) ?? 0;

  const executionPassRate =
    executions && executions.length > 0
      ? Math.round((executions.filter((e) => e.status === 'PASSED').length / executions.length) * 100)
      : null;

  return (
    <div>
      <PageHeader title="Executive Analytics" description="Cross-project quality, risk, and velocity trends." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/sprints">
          <SummaryCard
            label="Projects"
            value={String(summary?.projectsCount ?? 0)}
            icon={FolderKanban}
            isLoading={isSummaryLoading}
          />
        </Link>
        <Link href="/dashboard/sprints">
          <SummaryCard
            label="Active Sprints"
            value={String(summary?.activeSprintsCount ?? 0)}
            icon={Rocket}
            isLoading={isSummaryLoading}
          />
        </Link>
        <SummaryCard
          label="Avg. Requirement Coverage"
          value={formatPercent(summary?.avgCoveragePercent ?? null)}
          icon={ShieldCheck}
          isLoading={isSummaryLoading}
          hint="Averaged across sprints with computed coverage"
        />
        <SummaryCard
          label="Avg. Release Readiness"
          value={formatPercent(summary?.releaseReadinessPercent ?? null)}
          icon={TrendingUp}
          isLoading={isSummaryLoading}
          hint="Averaged across sprints with a computed report"
        />
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Velocity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <VelocityTrendChart data={summary?.velocityTrend ?? []} isLoading={isSummaryLoading} />
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Sprint Detail</h2>
      </div>

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <Select value={activeProjectId} onValueChange={setProjectId} disabled={isProjectsLoading || !projects?.length}>
          <SelectTrigger className="sm:w-64">
            <SelectValue placeholder="Choose a project" />
          </SelectTrigger>
          <SelectContent>
            {projects?.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={activeSprintId} onValueChange={setSprintId} disabled={isSprintsLoading || !sprints?.length}>
          <SelectTrigger className="sm:w-64">
            <SelectValue placeholder="Choose a sprint" />
          </SelectTrigger>
          <SelectContent>
            {sprints?.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!isProjectsLoading && !projects?.length ? (
        <div className="mt-4">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Import a sprint from Jira to start seeing sprint-level analytics."
          />
        </div>
      ) : !activeSprintId && !isSprintsLoading ? (
        <div className="mt-4">
          <EmptyState icon={Rocket} title="No sprints in this project" description="Import a sprint to see its analytics here." />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">
                {isSprintLoading ? <Skeleton className="h-5 w-40" /> : sprint?.name}
              </CardTitle>
              {sprint ? <Badge variant="outline">{sprint.status}</Badge> : null}
            </CardHeader>
            <CardContent>
              {isSprintLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Total stories</p>
                    <p className="text-xl font-semibold">{sprint?.stories.length ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Story points</p>
                    <p className="text-xl font-semibold">
                      {donePoints}/{totalPoints}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Start date</p>
                    <p className="text-xl font-semibold">
                      {sprint?.startDate ? new Date(sprint.startDate).toLocaleDateString() : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">End date</p>
                    <p className="text-xl font-semibold">
                      {sprint?.endDate ? new Date(sprint.endDate).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Story Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isSprintLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : !sprint?.stories.length ? (
                  <p className="text-sm text-muted-foreground">No stories in this sprint.</p>
                ) : (
                  <StoryStatusChart stories={sprint.stories} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Test Execution Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {isExecutionsLoading ? (
                  <Skeleton className="h-[220px] w-full" />
                ) : !executions?.length ? (
                  <EmptyState
                    icon={ShieldAlert}
                    title="No executions recorded"
                    description="Record test executions for this sprint to see the breakdown."
                  />
                ) : (
                  <>
                    <ExecutionStatusChart executions={executions} />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Pass rate: <span className="font-medium text-foreground">{formatPercent(executionPassRate)}</span>
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Test Coverage</CardTitle>
                {activeSprintId ? (
                  <Link href={`/dashboard/sprints/${activeSprintId}/coverage`} className="text-xs text-primary hover:underline">
                    View full coverage →
                  </Link>
                ) : null}
              </CardHeader>
              <CardContent>
                {isCoverageLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : !coverage ? (
                  <p className="text-sm text-muted-foreground">Coverage not computed yet for this sprint.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Coverage</p>
                      <p className="text-xl font-semibold">{coverage.summary.coveragePercent}%</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Covered</p>
                      <p className="text-xl font-semibold">{coverage.summary.coveredCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Gaps</p>
                      <p className="text-xl font-semibold">{coverage.gaps.length}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Release Readiness</CardTitle>
                {activeSprintId ? (
                  <Link
                    href={`/dashboard/sprints/${activeSprintId}/release-readiness`}
                    className="text-xs text-primary hover:underline"
                  >
                    View full report →
                  </Link>
                ) : null}
              </CardHeader>
              <CardContent>
                {isReleaseLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : !releaseReport ? (
                  <p className="text-sm text-muted-foreground">Release readiness not computed yet for this sprint.</p>
                ) : (
                  <div className="flex items-center gap-4">
                    <p className="text-3xl font-semibold">{releaseReport.readinessScore}/100</p>
                    <Badge variant={scoreVariant(releaseReport.readinessScore)}>{releaseReport.status}</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
