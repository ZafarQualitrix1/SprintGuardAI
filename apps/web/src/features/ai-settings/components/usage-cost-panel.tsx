'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAiCostSummary, useAiUsageSummary } from '@/features/ai-settings/api';
import { UsageTrendChart } from './usage-trend-chart';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function UsageCostPanel() {
  const { data: usage, isLoading: usageLoading } = useAiUsageSummary();
  const { data: cost, isLoading: costLoading } = useAiCostSummary();

  if (usageLoading || costLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!usage || !cost) {
    return <p className="text-sm text-destructive">Could not load usage/cost data.</p>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total requests" value={usage.totalRequests.toLocaleString()} />
        <StatCard
          label="Success rate"
          value={
            usage.totalRequests > 0
              ? `${Math.round((usage.successfulRequests / usage.totalRequests) * 100)}%`
              : '—'
          }
        />
        <StatCard
          label="Avg response time"
          value={usage.avgResponseTimeMs ? `${Math.round(usage.avgResponseTimeMs)}ms` : '—'}
        />
        <StatCard label="Avg tokens/request" value={usage.avgTokensPerRequest ? Math.round(usage.avgTokensPerRequest).toLocaleString() : '—'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Usage trend (last 14 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <UsageTrendChart data={usage.dailyTrend} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total cost (est.)" value={formatUsd(cost.totalCostUsd)} />
        <StatCard label="Last 24h cost" value={formatUsd(cost.last24hCostUsd)} />
        <StatCard label="Last 30d cost" value={formatUsd(cost.last30dCostUsd)} />
      </div>

      {cost.budget ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Monthly budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              ${cost.budget.usedUsd.toFixed(2)} used of ${cost.budget.limitUsd.toFixed(2)} (${cost.budget.remainingUsd.toFixed(2)}{' '}
              remaining)
            </p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min((cost.budget.usedUsd / cost.budget.limitUsd) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <p className="text-xs text-muted-foreground">
          No monthly budget configured for this organization -- cost is tracked but not alerted against a limit.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cost by provider</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cost.costByProvider.length === 0 ? (
              <p className="text-xs text-muted-foreground">No cost data yet.</p>
            ) : (
              cost.costByProvider.map((row) => (
                <div key={row.provider} className="flex items-center justify-between text-sm">
                  <span className="capitalize">{row.provider}</span>
                  <span className="text-muted-foreground">{formatUsd(row.costUsd)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Cost by module</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cost.costByModule.length === 0 ? (
              <p className="text-xs text-muted-foreground">No cost data yet.</p>
            ) : (
              cost.costByModule.map((row) => (
                <div key={row.agentKey} className="flex items-center justify-between text-sm">
                  <span>{row.agentName}</span>
                  <span className="text-muted-foreground">{formatUsd(row.costUsd)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
