'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const tooltipContentStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

const STATUS_ORDER = ['PASSED', 'FAILED', 'BLOCKED', 'SKIPPED'] as const;
export type ExecutionStatusKey = (typeof STATUS_ORDER)[number] | 'NOT_RUN';
const STATUS_LABEL: Record<(typeof STATUS_ORDER)[number], string> = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  BLOCKED: 'Blocked',
  SKIPPED: 'Skipped',
};
const STATUS_COLOR: Record<(typeof STATUS_ORDER)[number], string> = {
  PASSED: 'hsl(var(--success))',
  FAILED: 'hsl(var(--destructive))',
  BLOCKED: 'hsl(var(--warning))',
  SKIPPED: 'hsl(var(--secondary))',
};

interface ExecutionStatusChartProps {
  counts: Record<ExecutionStatusKey, number>;
}

export function ExecutionStatusChart({ counts }: ExecutionStatusChartProps) {
  // NOT_RUN deliberately excluded from the bars -- "not yet executed" isn't a result worth
  // charting alongside pass/fail/blocked/skipped outcomes.
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

export function countExecutionsByStatus(executions: { status: string }[]): Record<ExecutionStatusKey, number> {
  const counts: Record<ExecutionStatusKey, number> = { PASSED: 0, FAILED: 0, BLOCKED: 0, SKIPPED: 0, NOT_RUN: 0 };
  for (const execution of executions) {
    if (execution.status in counts) counts[execution.status as ExecutionStatusKey]++;
  }
  return counts;
}
