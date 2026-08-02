'use client';

import { useState } from 'react';
import { Unlock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAdminUnlock } from '@/features/ba-review/api';

// Admin Override: the only way an approved/locked story can accept AI generation again. Gated by
// the test:admin-unlock permission at both the button's render condition (caller passes
// canAdminUnlock) and, authoritatively, the backend controller.
export function AdminUnlockDialog({ storyId }: { storyId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const unlock = useAdminUnlock(storyId);

  const onConfirm = () =>
    unlock.mutate(reason, {
      onSuccess: () => {
        toast({ title: 'Story unlocked', description: 'AI generation is now allowed again for this story.' });
        setOpen(false);
        setReason('');
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not unlock',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Unlock className="mr-2 h-3.5 w-3.5" /> Admin Override: Unlock
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unlock this story</DialogTitle>
          <DialogDescription>
            This story&apos;s test cases are BA-approved and locked. Unlocking allows AI generation to run again --
            the approved version stays in history, but a new version will be created on the next generation.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for unlocking (required for audit log)…"
        />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={unlock.isPending || !reason.trim()}>
            {unlock.isPending ? 'Unlocking…' : 'Unlock story'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
