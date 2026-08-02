'use client';

import { Badge } from '@/components/ui/badge';
import type { TraceabilityRequirement } from '@sprintguard/shared';

export function CoverageTraceabilityMatrix({ requirements }: { requirements: TraceabilityRequirement[] }) {
  if (requirements.length === 0) {
    return <p className="text-sm text-muted-foreground">No requirements found for this story.</p>;
  }

  return (
    <div className="max-h-[32rem] space-y-4 overflow-y-auto">
      {requirements.map((requirement) => (
        <div key={requirement.requirementId} className="rounded-md border p-3">
          <p className="mb-2 text-sm font-medium">{requirement.requirementText}</p>
          {requirement.acceptanceCriteria.length === 0 ? (
            <p className="text-xs text-muted-foreground">No acceptance criteria yet.</p>
          ) : (
            <div className="space-y-2">
              {requirement.acceptanceCriteria.map((ac) => (
                <div key={ac.id} className="rounded bg-muted/50 p-2">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Given</span> {ac.given}{' '}
                    <span className="font-medium text-foreground">When</span> {ac.when}{' '}
                    <span className="font-medium text-foreground">Then</span> {ac.then}
                  </p>
                  {ac.testCases.length === 0 ? (
                    <p className="mt-1 text-xs text-destructive">No test case mapped yet.</p>
                  ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {ac.testCases.map((tc) => (
                        <Badge key={tc.id} variant="secondary" title={tc.title} className="font-normal">
                          {tc.title.length > 40 ? `${tc.title.slice(0, 40)}…` : tc.title}
                          <span className="ml-1 opacity-70">· {tc.testType}</span>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
