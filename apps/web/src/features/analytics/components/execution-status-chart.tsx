'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Execution } from '@sprintguard/shared';

const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const tooltipContentStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

const STATUS_ORDER = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED', 'NOT_RUN'] as const;
const STATUS_COLOR: Record<(typeof STATUS_ORDER)[number], string> = {
  PASSED: 'hsl(var(--success))',
  FAILED: 'hsl(var(--destructive))',
  BLOCKED: 'hsl(var(--warning))',
  SKIPPED: 'hsl(var(--secondary))',
  NOT_RUN: 'hsl(var(--muted))',
};

interface ExecutionStatusChartProps {
  executions: Pick<Execution, 'status'>[];
}

export function ExecutionStatusChart({ executions }: ExecutionStatusChartProps) {
  const data = STATUS_ORDER.filter((status) => status !== 'NOT_RUN').map((status) => ({
    status,
    count: executions.filter((e) => e.status === status).length,
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
