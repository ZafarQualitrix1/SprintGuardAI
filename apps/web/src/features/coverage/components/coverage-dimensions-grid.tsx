'use client';

import { Progress } from '@/components/ui/progress';
import type { CoverageDimensions } from '@sprintguard/shared';

const DIMENSIONS: { key: keyof CoverageDimensions; label: string }[] = [
  { key: 'requirementCoverage', label: 'Requirement Coverage' },
  { key: 'acceptanceCriteriaCoverage', label: 'Acceptance Criteria Coverage' },
  { key: 'functionalCoverage', label: 'Functional Coverage' },
  { key: 'boundaryCoverage', label: 'Boundary Coverage' },
  { key: 'negativeCoverage', label: 'Negative Coverage' },
  { key: 'riskCoverage', label: 'Risk Coverage' },
  { key: 'automationCoverage', label: 'Automation Coverage' },
];

export function CoverageDimensionsGrid({ dimensions }: { dimensions: CoverageDimensions }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2">
      {DIMENSIONS.map((dimension) => (
        <div key={dimension.key} className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{dimension.label}</span>
            <span className="font-medium">{dimensions[dimension.key]}%</span>
          </div>
          <Progress value={dimensions[dimension.key]} />
        </div>
      ))}
    </div>
  );
}
