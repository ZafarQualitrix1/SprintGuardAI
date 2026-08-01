'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Story } from '@sprintguard/shared';

// Same CSS-variable-driven styling as velocity-trend-chart.tsx so both charts repaint correctly
// on theme toggle instead of using Recharts' hardcoded light-mode defaults.
const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const tooltipContentStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

const STATUS_ORDER = ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'] as const;
const STATUS_COLOR: Record<(typeof STATUS_ORDER)[number], string> = {
  BACKLOG: 'hsl(var(--secondary))',
  IN_PROGRESS: 'hsl(var(--warning))',
  IN_REVIEW: 'hsl(var(--warning))',
  BLOCKED: 'hsl(var(--destructive))',
  DONE: 'hsl(var(--success))',
};

interface StoryStatusChartProps {
  stories: Pick<Story, 'status'>[];
}

export function StoryStatusChart({ stories }: StoryStatusChartProps) {
  const data = STATUS_ORDER.map((status) => ({
    status,
    count: stories.filter((s) => s.status === status).length,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis
          dataKey="status"
          tick={axisTickStyle}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          allowDecimals={false}
          tick={axisTickStyle}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <Tooltip contentStyle={tooltipContentStyle} cursor={{ fill: 'hsl(var(--accent))' }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.status} fill={STATUS_COLOR[entry.status]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
