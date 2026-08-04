'use client';

import { TrendingUp } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

interface PassFailTrendChartProps {
  history: ReleaseReport[];
}

export function PassFailTrendChart({ history }: PassFailTrendChartProps) {
  if (history.length === 0) {
    return (
      <EmptyState icon={TrendingUp} title="No history yet" description="Compute release readiness a few times to see a trend." />
    );
  }

  const data = history.map((report, index) => ({
    label: `#${index + 1}`,
    manualPassRate: report.breakdown.manualPassRate,
    automationPassRate: report.breakdown.automationPassRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
        <YAxis
          domain={[0, 100]}
          tick={axisTickStyle}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={false}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip contentStyle={tooltipContentStyle} formatter={(value: number) => `${value}%`} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
        <Line
          type="monotone"
          dataKey="manualPassRate"
          name="Manual pass rate"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="automationPassRate"
          name="Automation pass rate"
          stroke="hsl(var(--warning))"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
