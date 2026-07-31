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
import { useDisconnectConnection } from '@/features/integration/api';
import { cn } from '@/lib/utils';

interface DisconnectConnectionDialogProps {
  connection: IntegrationConnection;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DisconnectConnectionDialog({ connection, open, onOpenChange }: DisconnectConnectionDialogProps) {
  const disconnect = useDisconnectConnection();

  const handleDisconnect = () => {
    disconnect.mutate(connection.id, {
      onSuccess: () => {
        toast({ title: 'Workspace disconnected', description: connection.name });
        onOpenChange(false);
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not disconnect',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect {connection.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to disconnect this Jira workspace? Imported sprint data will
            remain available. Only the authentication details will be removed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: 'destructive' }))}
            onClick={handleDisconnect}
            disabled={disconnect.isPending}
          >
            {disconnect.isPending ? 'Disconnecting…' : 'Disconnect'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
