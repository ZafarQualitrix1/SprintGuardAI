'use client';

import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { BarChart3 } from 'lucide-react';
import { usePromptAnalytics } from '@/features/prompts/api';

const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const tooltipContentStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

function StatTile({ label, value }: { label: string; value: string }) {
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

export function PromptAnalytics() {
  const { data, isLoading } = usePromptAnalytics(30);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!data || data.totalExecutions === 0) {
    return (
      <EmptyState
        icon={BarChart3}
        title="No executions in the last 30 days"
        description="Analytics populate once agents start running against your organization's prompts."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total Executions" value={String(data.totalExecutions)} />
        <StatTile label="Success Rate" value={`${Math.round(data.successRate * 100)}%`} />
        <StatTile label="Failure Rate" value={`${Math.round(data.failureRate * 100)}%`} />
        <StatTile label="Avg Response Time" value={`${Math.round(data.avgLatencyMs)}ms`} />
        <StatTile label="Avg Tokens" value={String(Math.round(data.avgTokens))} />
        <StatTile label="Avg Cost" value={`$${data.avgCostUsd.toFixed(4)}`} />
        <StatTile label="Avg Confidence" value={`${Math.round(data.avgConfidenceScore * 100)}%`} />
        <StatTile label="Capabilities Tracked" value={String(data.byCapability.length)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Execution Trend (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.trend}>
                <XAxis dataKey="date" tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                <YAxis tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Line type="monotone" dataKey="executions" name="Executions" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Cost &amp; Token Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.trend}>
                <XAxis dataKey="date" tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                <YAxis tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Line type="monotone" dataKey="avgTokens" name="Avg Tokens" stroke="hsl(var(--primary))" strokeWidth={2} />
                <Line type="monotone" dataKey="avgCostUsd" name="Avg Cost ($)" stroke="hsl(var(--secondary-foreground))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Executions by Capability</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byCapability}>
                <XAxis dataKey="capability" tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                <YAxis tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Bar dataKey="executions" name="Executions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Executions by Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.byProvider}>
                <XAxis dataKey="provider" tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                <YAxis tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Bar dataKey="executions" name="Executions" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Performing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topPerforming.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not enough data yet.</p>
            ) : (
              data.topPerforming.map((p) => (
                <div key={p.capability} className="flex items-center justify-between text-sm">
                  <span>{p.capability}</span>
                  <Badge variant="success">{Math.round(p.successRate * 100)}%</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.poorPerforming.length === 0 ? (
              <p className="text-xs text-muted-foreground">Not enough data yet.</p>
            ) : (
              data.poorPerforming.map((p) => (
                <div key={p.capability} className="flex items-center justify-between text-sm">
                  <span>{p.capability}</span>
                  <Badge variant="warning">{Math.round(p.successRate * 100)}%</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
