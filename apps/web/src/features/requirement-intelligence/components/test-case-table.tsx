'use client';

import type { RequirementAnalysisTestCase } from '@sprintguard/shared';
import { Badge } from '@/components/ui/badge';

function priorityVariant(priority: string): 'destructive' | 'warning' | 'secondary' | 'outline' {
  if (priority === 'CRITICAL') return 'destructive';
  if (priority === 'HIGH') return 'warning';
  if (priority === 'MEDIUM') return 'secondary';
  return 'outline';
}

export function TestCaseTable({ testCases }: { testCases: RequirementAnalysisTestCase[] }) {
  if (testCases.length === 0) {
    return <p className="text-xs text-muted-foreground">No test cases generated.</p>;
  }

  return (
    <div className="space-y-3">
      {testCases.map((tc) => (
        <div key={tc.id} className="rounded-md border p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground">{tc.id}</span> — {tc.title}
            </p>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={priorityVariant(tc.priority)}>{tc.priority}</Badge>
              <Badge variant="outline">{tc.testType}</Badge>
              <Badge variant="outline">{tc.classification}</Badge>
              <Badge variant={tc.positiveOrNegative === 'NEGATIVE' ? 'warning' : 'secondary'}>
                {tc.positiveOrNegative}
              </Badge>
              {tc.automationCandidate ? <Badge variant="success">Automatable</Badge> : null}
            </div>
          </div>
          <p className="mb-2 text-xs text-muted-foreground">{tc.objective}</p>
          {tc.preconditions.length > 0 ? (
            <p className="mb-1 text-xs">
              <span className="font-medium">Preconditions:</span> {tc.preconditions.join('; ')}
            </p>
          ) : null}
          <ol className="mb-2 list-decimal space-y-1 pl-4">
            {tc.steps.map((step, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                {step.step} <span className="font-medium text-foreground">→</span> {step.expected}
              </li>
            ))}
          </ol>
          <p className="text-xs">
            <span className="font-medium">Expected result:</span> {tc.expectedResult}
          </p>
          {tc.tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {tc.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
