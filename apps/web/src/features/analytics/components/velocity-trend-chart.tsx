'use client';

import { TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { VelocityPoint } from '../api/dashboard-summary.types';

// CSS-variable-driven styling (not hardcoded hex) so the chart repaints correctly on theme
// toggle -- Recharts' default tick fill/tooltip background are hardcoded light-mode colors and
// would otherwise look broken in dark mode.
const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 11 };
const tooltipContentStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

interface VelocityTrendChartProps {
  data: VelocityPoint[];
  isLoading?: boolean;
}

export function VelocityTrendChart({ data, isLoading }: VelocityTrendChartProps) {
  if (isLoading) {
    return <Skeleton className="h-[280px] w-full" />;
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={TrendingUp}
        title="No sprint history yet"
        description="Import your first sprint to start tracking velocity across your team."
      />
    );
  }

  const allZero = data.every((point) => point.pointsCompleted === 0);

  return (
    <div className="space-y-2">
      <ResponsiveContainer width="100%" height={260}>
        {/* Bars, not a connected line: these are independent sprints -- sometimes from different
            projects -- so a line implying one continuous trajectory between them would overstate
            the connection between points. Each bar stands on its own. */}
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="sprintName"
            tick={axisTickStyle}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={56}
          />
          <YAxis
            tick={axisTickStyle}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
            allowDecimals={false}
            label={{ value: 'Story points completed', angle: -90, position: 'insideLeft', style: { fill: 'hsl(var(--muted-foreground))', fontSize: 11 } }}
          />
          <Tooltip contentStyle={tooltipContentStyle} cursor={{ fill: 'hsl(var(--accent))' }} />
          <Bar dataKey="pointsCompleted" name="Points completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
      {allZero ? (
        <p className="text-center text-xs text-muted-foreground">
          No stories marked Done with story points in these sprints yet -- velocity will appear here once work is
          completed and pointed.
        </p>
      ) : null}
    </div>
  );
}
