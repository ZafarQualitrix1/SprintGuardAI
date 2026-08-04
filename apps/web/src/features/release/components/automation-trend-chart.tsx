'use client';

import { Bot } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ReleaseReport } from '@sprintguard/shared';
import { EmptyState } from '@/components/layout/empty-state';

const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const tooltipContentStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

interface AutomationTrendChartProps {
  history: ReleaseReport[];
}

export function AutomationTrendChart({ history }: AutomationTrendChartProps) {
  if (history.length === 0) {
    return (
      <EmptyState icon={Bot} title="No history yet" description="Compute release readiness a few times to see automation trend." />
    );
  }

  const data = history.map((report, index) => ({
    label: `#${index + 1}`,
    passed: report.breakdown.automationPassedCount,
    failed: report.breakdown.automationFailedCount,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
        <Tooltip contentStyle={tooltipContentStyle} cursor={{ fill: 'hsl(var(--accent))' }} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
        <Bar dataKey="passed" name="Passed" stackId="runs" fill="hsl(var(--success))" radius={[0, 0, 0, 0]} />
        <Bar dataKey="failed" name="Failed" stackId="runs" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
