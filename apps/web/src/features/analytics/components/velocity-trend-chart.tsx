'use client';

import { TrendingUp } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/layout/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import type { VelocityPoint } from '../api/dashboard-summary.types';

// CSS-variable-driven styling (not hardcoded hex) so the chart repaints correctly on theme
// toggle -- Recharts' default tick fill/tooltip background are hardcoded light-mode colors and
// would otherwise look broken in dark mode.
const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
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
        description="Import your first sprint to start tracking velocity trends across your team."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <XAxis
          dataKey="sprintName"
          tick={axisTickStyle}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={axisTickStyle}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip contentStyle={tooltipContentStyle} />
        <Line type="monotone" dataKey="pointsCompleted" stroke="hsl(var(--primary))" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
