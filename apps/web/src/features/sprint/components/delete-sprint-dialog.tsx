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
import { useDeleteSprint } from '@/features/sprint/api';
import { cn } from '@/lib/utils';

interface DeleteSprintDialogProps {
  sprint: Sprint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteSprintDialog({ sprint, open, onOpenChange }: DeleteSprintDialogProps) {
  const deleteSprint = useDeleteSprint(sprint.projectId);

  const handleDelete = () => {
    deleteSprint.mutate(sprint.id, {
      onSuccess: () => {
        toast({ title: 'Sprint deleted', description: sprint.name });
        onOpenChange(false);
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not delete sprint',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{sprint.name}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the sprint from your list. It&apos;s a soft delete, so the data isn&apos;t
            immediately destroyed, but the sprint won&apos;t be visible or usable anymore.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: 'destructive' }))}
            onClick={handleDelete}
            disabled={deleteSprint.isPending}
          >
            {deleteSprint.isPending ? 'Deleting…' : 'Delete sprint'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
