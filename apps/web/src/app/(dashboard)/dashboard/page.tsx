'use client';

import { motion } from 'framer-motion';
import { AlertCircle, Bug, ClipboardCheck, Rocket, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SummaryCard, type SummaryCardTone } from '@/features/analytics/components/summary-card';
import { VelocityTrendChart } from '@/features/analytics/components/velocity-trend-chart';
import { StoryStatusChart } from '@/features/analytics/components/story-status-chart';
import { ExecutionStatusChart } from '@/features/analytics/components/execution-status-chart';
import { useDashboardSummary } from '@/features/analytics/api';
import { ConnectionsGrid } from '@/features/integration/components';
import { useAuthStore } from '@/stores/auth-store';

const cardContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

function formatPercent(value: number | null): string {
  return value === null ? '—' : `${value}%`;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError, refetch } = useDashboardSummary();

  const summaryCards: { label: string; value: string; icon: typeof Rocket; tone: SummaryCardTone; hint?: string }[] = [
    { label: 'Active Sprints', value: String(data?.activeSprintsCount ?? 0), icon: Rocket, tone: 'primary' },
    {
      label: 'Avg. Coverage',
      value: formatPercent(data?.avgCoveragePercent ?? null),
      icon: ShieldCheck,
      tone: 'success',
    },
    { label: 'Open Risks', value: String(data?.openRisksCount ?? 0), icon: ShieldAlert, tone: 'warning' },
    {
      label: 'Release Readiness',
      value: formatPercent(data?.releaseReadinessPercent ?? null),
      icon: TrendingUp,
      tone: 'primary',
    },
    { label: 'Test Cases', value: (data?.totalTestCases ?? 0).toLocaleString(), icon: ClipboardCheck, tone: 'default' },
    { label: 'Open Bugs', value: String(data?.openDefectsCount ?? 0), icon: Bug, tone: 'destructive' },
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          user
            ? `Welcome back, ${user.fullName.split(' ')[0]} — here's ${user.organizationName}'s sprint quality overview.`
            : 'Cross-project sprint quality overview.'
        }
      />

      {isError ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn&apos;t load dashboard data</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>Something went wrong fetching your summary. Please try again.</span>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <motion.div
        variants={cardContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6"
      >
        {summaryCards.map((card) => (
          <motion.div key={card.label} variants={cardItem}>
            <SummaryCard label={card.label} value={card.value} icon={card.icon} tone={card.tone} isLoading={isLoading} />
          </motion.div>
        ))}
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Story Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <div className="h-[220px] animate-pulse rounded-md bg-muted" />
            ) : (
              <StoryStatusChart counts={data.storyStatusBreakdown} />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Test Execution Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !data ? (
              <div className="h-[220px] animate-pulse rounded-md bg-muted" />
            ) : (
              <ExecutionStatusChart counts={data.executionStatusBreakdown} />
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Velocity Trend</CardTitle>
          <p className="text-xs text-muted-foreground">Story points completed, most recent 10 sprints</p>
        </CardHeader>
        <CardContent>
          <VelocityTrendChart data={data?.velocityTrend ?? []} isLoading={isLoading} />
        </CardContent>
      </Card>

      <div className="mt-6 space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Jira Workspaces</h2>
        <ConnectionsGrid />
      </div>
    </div>
  );
}
