'use client';

import type { Sprint } from '@sprintguard/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useOverrideSprint } from '@/features/sprint/api';
import { cn } from '@/lib/utils';

interface OverrideSprintDialogProps {
  sprint: Sprint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OverrideSprintDialog({ sprint, open, onOpenChange }: OverrideSprintDialogProps) {
  const override = useOverrideSprint(sprint.projectId);

  const handleOverride = () => {
    override.mutate(sprint.id, {
      onSuccess: () => {
        toast({ title: 'Sprint overridden', description: 'Re-imported fresh from Jira.' });
        onOpenChange(false);
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not override sprint',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Override &ldquo;{sprint.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This completely refreshes the sprint from Jira: every story is deleted and recreated,
            which also permanently deletes their AI-generated data (Requirements, Coverage,
            generated Test Cases, and Execution history). Use &ldquo;Refresh Sprint&rdquo; instead
            if you just want to pull in the latest Jira changes without losing that work.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: 'destructive' }))}
            onClick={handleOverride}
            disabled={override.isPending}
          >
            {override.isPending ? 'Overriding…' : 'Override sprint'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
