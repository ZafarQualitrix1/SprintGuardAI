'use client';

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { DefectSeverityLevel } from '@sprintguard/shared';
import { DEFECT_SEVERITIES } from '@sprintguard/shared';
import { EmptyState } from '@/components/layout/empty-state';
import { ShieldAlert } from 'lucide-react';

const tooltipContentStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

// Two hue families by severity tier (red = release-blocking, amber = needs attention, muted =
// low priority), stepped by opacity within each -- keeps this chart inside the app's existing
// semantic status tokens rather than introducing a new categorical palette for one chart.
const SEVERITY_COLOR: Record<DefectSeverityLevel, string> = {
  BLOCKER: 'hsl(var(--destructive))',
  CRITICAL: 'hsl(var(--destructive) / 0.7)',
  HIGH: 'hsl(var(--warning))',
  MAJOR: 'hsl(var(--warning) / 0.65)',
  MEDIUM: 'hsl(var(--secondary))',
  MINOR: 'hsl(var(--muted-foreground) / 0.55)',
  TRIVIAL: 'hsl(var(--muted-foreground) / 0.3)',
};

interface BugSeverityPieChartProps {
  openCounts: Record<DefectSeverityLevel, number>;
}

export function BugSeverityPieChart({ openCounts }: BugSeverityPieChartProps) {
  const data = DEFECT_SEVERITIES.map((severity) => ({ severity, count: openCounts[severity] ?? 0 })).filter(
    (d) => d.count > 0,
  );

  if (data.length === 0) {
    return (
      <EmptyState icon={ShieldAlert} title="No open defects" description="No open bugs are currently tracked for this sprint." />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="severity" innerRadius={50} outerRadius={80} paddingAngle={2}>
          {data.map((entry) => (
            <Cell key={entry.severity} fill={SEVERITY_COLOR[entry.severity]} stroke="hsl(var(--card))" strokeWidth={2} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipContentStyle} formatter={(value: number, name: string) => [value, name]} />
        <Legend wrapperStyle={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
