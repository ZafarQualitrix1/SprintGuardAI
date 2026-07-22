'use client';

import { motion } from 'framer-motion';
import { AlertCircle, FolderKanban, Rocket, ShieldAlert, ShieldCheck, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { SummaryCard } from '@/features/analytics/components/summary-card';
import { VelocityTrendChart } from '@/features/analytics/components/velocity-trend-chart';
import { useDashboardSummary } from '@/features/analytics/api';
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

  const summaryCards = [
    { label: 'Active Sprints', value: String(data?.activeSprintsCount ?? 0), icon: Rocket },
    { label: 'Avg. Coverage', value: formatPercent(data?.avgCoveragePercent ?? null), icon: ShieldCheck },
    { label: 'Open Risks', value: String(data?.openRisksCount ?? 0), icon: ShieldAlert },
    {
      label: 'Release Readiness',
      value: formatPercent(data?.releaseReadinessPercent ?? null),
      icon: TrendingUp,
    },
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
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {summaryCards.map((card) => (
          <motion.div key={card.label} variants={cardItem}>
            <SummaryCard label={card.label} value={card.value} icon={card.icon} isLoading={isLoading} />
          </motion.div>
        ))}
      </motion.div>

      {!isLoading && !isError && data?.projectsCount === 0 ? (
        <Card className="mt-4">
          <CardContent className="pt-6">
            <EmptyState
              icon={FolderKanban}
              title="No projects yet"
              description="Create a project and import your first sprint to start seeing coverage, risk, and release readiness data here."
              action={
                <Button asChild>
                  <Link href={'/dashboard/sprints/upload' as never}>Import a sprint</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Velocity Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <VelocityTrendChart data={data?.velocityTrend ?? []} isLoading={isLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
