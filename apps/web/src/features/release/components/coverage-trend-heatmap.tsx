'use client';

import type { CSSProperties } from 'react';
import { Grid3x3 } from 'lucide-react';
import type { ReleaseReport } from '@sprintguard/shared';
import { EmptyState } from '@/components/layout/empty-state';
import { cn } from '@/lib/utils';

interface CoverageTrendHeatmapProps {
  history: ReleaseReport[];
}

const ROWS: { key: 'requirementCoveragePercent' | 'testCaseCoveragePercent'; label: string }[] = [
  { key: 'requirementCoveragePercent', label: 'Requirement coverage' },
  { key: 'testCaseCoveragePercent', label: 'Test case coverage' },
];

// Sequential single-hue ramp (primary, light -> dark by opacity) rather than a discrete color
// scale -- a magnitude encoding, not a categorical one.
function cellStyle(percent: number): CSSProperties {
  const alpha = 0.12 + (Math.max(0, Math.min(100, percent)) / 100) * 0.78;
  return { backgroundColor: `hsl(var(--primary) / ${alpha.toFixed(2)})` };
}

export function CoverageTrendHeatmap({ history }: CoverageTrendHeatmapProps) {
  if (history.length === 0) {
    return (
      <EmptyState icon={Grid3x3} title="No history yet" description="Compute release readiness a few times to see a coverage trend." />
    );
  }

  return (
    <div className="space-y-2">
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-center gap-2">
          <span className="w-36 shrink-0 text-xs text-muted-foreground">{row.label}</span>
          <div className="flex flex-1 gap-1">
            {history.map((report, index) => {
              const value = report.breakdown[row.key];
              return (
                <div
                  key={report.id}
                  title={`#${index + 1}: ${value}%`}
                  style={cellStyle(value)}
                  className={cn('flex h-8 flex-1 items-center justify-center rounded-sm text-[10px] font-medium text-primary-foreground')}
                >
                  {value}%
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
