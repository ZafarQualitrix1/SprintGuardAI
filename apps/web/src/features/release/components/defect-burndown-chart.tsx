'use client';

import { Bug } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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

interface DefectBurndownChartProps {
  history: ReleaseReport[];
}

export function DefectBurndownChart({ history }: DefectBurndownChartProps) {
  if (history.length === 0) {
    return (
      <EmptyState icon={Bug} title="No history yet" description="Compute release readiness a few times to see the defect burndown." />
    );
  }

  const data = history.map((report, index) => ({
    label: `#${index + 1}`,
    openDefects: Object.values(report.breakdown.bugRisk.openCounts).reduce((sum, count) => sum + count, 0),
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="openDefectsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis dataKey="label" tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
        <YAxis allowDecimals={false} tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={false} />
        <Tooltip contentStyle={tooltipContentStyle} />
        <Area
          type="monotone"
          dataKey="openDefects"
          name="Open defects"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
          fill="url(#openDefectsFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
