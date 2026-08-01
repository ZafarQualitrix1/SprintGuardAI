'use client';

import type { IntegrationConnection } from '@sprintguard/shared';
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
import { useDeleteConnection } from '@/features/integration/api';
import { cn } from '@/lib/utils';

interface DeleteConnectionDialogProps {
  connection: IntegrationConnection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteConnectionDialog({ connection, open, onOpenChange }: DeleteConnectionDialogProps) {
  const deleteConnection = useDeleteConnection();

  const handleDelete = () => {
    deleteConnection.mutate(connection.id, {
      onSuccess: () => {
        toast({ title: 'Connection permanently deleted', description: connection.name });
        onOpenChange(false);
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not delete connection',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete {connection.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This cannot be undone. It permanently removes this Jira connection, its cached project
            list, and its sync/webhook history. Sprint data already imported through this connection
            will not be affected.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: 'destructive' }))}
            onClick={handleDelete}
            disabled={deleteConnection.isPending}
          >
            {deleteConnection.isPending ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
