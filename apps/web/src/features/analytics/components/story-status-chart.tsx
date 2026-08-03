'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
export type StoryStatusKey = (typeof STATUS_ORDER)[number];
const STATUS_LABEL: Record<StoryStatusKey, string> = {
  BACKLOG: 'Backlog',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  BLOCKED: 'Blocked',
  DONE: 'Done',
};
const STATUS_COLOR: Record<StoryStatusKey, string> = {
  BACKLOG: 'hsl(var(--secondary))',
  IN_PROGRESS: 'hsl(var(--warning))',
  IN_REVIEW: 'hsl(var(--warning))',
  BLOCKED: 'hsl(var(--destructive))',
  DONE: 'hsl(var(--success))',
};

interface StoryStatusChartProps {
  counts: Record<StoryStatusKey, number>;
}

export function StoryStatusChart({ counts }: StoryStatusChartProps) {
  const data = STATUS_ORDER.map((status) => ({ status, label: STATUS_LABEL[status], count: counts[status] }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data}>
        <XAxis
          dataKey="label"
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

export function countStoriesByStatus(stories: { status: string }[]): Record<StoryStatusKey, number> {
  const counts = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<StoryStatusKey, number>;
  for (const story of stories) {
    if (story.status in counts) counts[story.status as StoryStatusKey]++;
  }
  return counts;
}
