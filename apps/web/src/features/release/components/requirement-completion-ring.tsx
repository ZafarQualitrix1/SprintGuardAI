'use client';

import { RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';

interface RequirementCompletionRingProps {
  percent: number;
  covered: number;
  total: number;
}

function ringColor(percent: number): string {
  if (percent >= 100) return 'hsl(var(--success))';
  if (percent >= 70) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

export function RequirementCompletionRing({ percent, covered, total }: RequirementCompletionRingProps) {
  const data = [{ name: 'coverage', value: percent, fill: ringColor(percent) }];

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={200}>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={90}
          endAngle={-270}
          barSize={14}
        >
          <RadialBar dataKey="value" background={{ fill: 'hsl(var(--muted))' }} cornerRadius={7} max={100} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-2xl font-semibold">{percent}%</p>
        <p className="text-xs text-muted-foreground">
          {covered}/{total} requirements
        </p>
      </div>
    </div>
  );
}
