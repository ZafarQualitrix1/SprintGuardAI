'use client';

import { Activity } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState } from '@/components/layout/empty-state';

// CSS-variable-driven styling (not hardcoded hex) so the chart repaints correctly on theme toggle.
const axisTickStyle = { fill: 'hsl(var(--muted-foreground))', fontSize: 12 };
const tooltipContentStyle = {
  background: 'hsl(var(--popover))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 'var(--radius)',
  color: 'hsl(var(--popover-foreground))',
  fontSize: 12,
};

interface UsageTrendChartProps {
  data: Array<{ date: string; requests: number; tokens: number }>;
}

export function UsageTrendChart({ data }: UsageTrendChartProps) {
  if (data.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No AI activity yet"
        description="Usage will appear here once an AI-powered feature runs for this organization."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          tick={axisTickStyle}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis tick={axisTickStyle} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
        <Tooltip contentStyle={tooltipContentStyle} />
        <Line type="monotone" dataKey="requests" name="Requests" stroke="hsl(var(--primary))" strokeWidth={2} />
        <Line type="monotone" dataKey="tokens" name="Tokens" stroke="hsl(var(--secondary-foreground))" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
