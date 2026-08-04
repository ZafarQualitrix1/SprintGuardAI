'use client';

import type { SprintReleaseGates } from '@sprintguard/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useSprintReleaseGates, useUpdateSprintReleaseGates } from '@/features/release/api';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';

interface ReleaseGatesCardProps {
  sprintId: string;
}

export function ReleaseGatesCard({ sprintId }: ReleaseGatesCardProps) {
  const { data: gates, isLoading } = useSprintReleaseGates(sprintId);
  const updateGates = useUpdateSprintReleaseGates(sprintId);

  const toggle = (field: keyof SprintReleaseGates, value: boolean) => {
    updateGates.mutate(
      { [field]: value },
      {
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not update gate',
            description: error instanceof ApiError ? error.message : undefined,
          }),
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Release gates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading || !gates ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="regressionCompleted"
                checked={gates.regressionCompleted}
                disabled={updateGates.isPending}
                onCheckedChange={(checked) => toggle('regressionCompleted', checked === true)}
              />
              <Label htmlFor="regressionCompleted" className="text-sm font-normal">
                Regression testing completed
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="deploymentChecklistComplete"
                checked={gates.deploymentChecklistComplete}
                disabled={updateGates.isPending}
                onCheckedChange={(checked) => toggle('deploymentChecklistComplete', checked === true)}
              />
              <Label htmlFor="deploymentChecklistComplete" className="text-sm font-normal">
                Deployment checklist completed
              </Label>
            </div>
          </>
        )}
        <p className="text-xs text-muted-foreground">
          Both are mandatory release gates — release stays Blocked while either is incomplete, regardless of score.
        </p>
      </CardContent>
    </Card>
  );
}
