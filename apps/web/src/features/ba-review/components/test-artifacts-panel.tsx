'use client';

import { useState } from 'react';
import { ClipboardList, FileText, ListChecks } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { useTestScenarios } from '@/features/test-intelligence/api';
import { useBaReviewStatus } from '@/features/ba-review/api';
import { SubmitForReviewDialog } from './submit-for-review-dialog';

const priorityVariant: Record<string, 'default' | 'secondary' | 'warning' | 'destructive'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  CRITICAL: 'destructive',
};

interface TestArtifactsPanelProps {
  storyId: string;
  storyTitle: string;
}

// What's actually being reviewed, in one place: how many test cases are attached, and a way to
// preview them without leaving this page -- separate from StoryTestGeneratorCard (which owns
// generating/regenerating and lives on the dedicated Test Generator page) since this panel is
// read-only by design.
export function TestArtifactsPanel({ storyId, storyTitle }: TestArtifactsPanelProps) {
  const { data: scenarios, isLoading } = useTestScenarios(storyId);
  const { data: status } = useBaReviewStatus(storyId);
  const [showScenarios, setShowScenarios] = useState(false);
  const [showCases, setShowCases] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const scenarioCount = scenarios?.length ?? 0;
  const caseCount = scenarios?.reduce((sum, s) => sum + s.testCases.length, 0) ?? 0;
  const canSubmit = Boolean(status && !status.isLocked && status.activeCycle);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" />
          Test artifacts
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowScenarios((v) => !v)}
            disabled={scenarioCount === 0}
          >
            <FileText className="mr-2 h-4 w-4" />
            {showScenarios ? 'Hide Test Scenarios' : 'Show Test Scenarios'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setShowCases((v) => !v)} disabled={caseCount === 0}>
            <ListChecks className="mr-2 h-4 w-4" />
            {showCases ? 'Hide Test Cases' : 'Show Test Cases'}
          </Button>
          <Button size="sm" onClick={() => setSubmitDialogOpen(true)} disabled={!canSubmit}>
            Submit for Review
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : caseCount === 0 ? (
          <EmptyState
            icon={ListChecks}
            title="No test cases attached yet"
            description="Generate test scenarios and test cases from the Test Generator tab, then come back here to submit them for review."
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{caseCount}</span> test case{caseCount === 1 ? '' : 's'}{' '}
            attached across <span className="font-medium text-foreground">{scenarioCount}</span> scenario
            {scenarioCount === 1 ? '' : 's'}.
          </p>
        )}

        {showScenarios && scenarios ? (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Test scenarios</p>
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="flex items-start justify-between gap-2 rounded-md border p-2">
                <div>
                  <p className="text-sm font-medium">{scenario.title}</p>
                  {scenario.description ? (
                    <p className="text-xs text-muted-foreground">{scenario.description}</p>
                  ) : null}
                </div>
                <Badge variant={priorityVariant[scenario.priority] ?? 'default'}>{scenario.priority}</Badge>
              </div>
            ))}
          </div>
        ) : null}

        {showCases && scenarios ? (
          <div className="space-y-3 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">Test cases</p>
            {scenarios.map((scenario) => (
              <div key={scenario.id} className="space-y-2">
                {scenario.testCases.length > 0 ? (
                  <p className="text-xs font-medium text-muted-foreground">{scenario.title}</p>
                ) : null}
                {scenario.testCases.map((testCase) => (
                  <div key={testCase.id} className="rounded bg-muted/50 p-2">
                    <p className="mb-1 text-xs font-medium">{testCase.title}</p>
                    <ol className="list-decimal space-y-0.5 pl-4">
                      {testCase.steps.map((step, index) => (
                        <li key={index} className="text-xs text-muted-foreground">
                          {step.step} <span className="italic">→ {step.expected}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
      <SubmitForReviewDialog
        storyId={storyId}
        storyTitle={storyTitle}
        open={submitDialogOpen}
        onOpenChange={setSubmitDialogOpen}
      />
    </Card>
  );
}
