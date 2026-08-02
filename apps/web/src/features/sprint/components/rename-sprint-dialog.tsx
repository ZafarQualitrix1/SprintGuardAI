'use client';

import { useEffect, useState } from 'react';
import type { Sprint } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useRenameSprint } from '@/features/sprint/api';

interface RenameSprintDialogProps {
  sprint: Sprint;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RenameSprintDialog({ sprint, open, onOpenChange }: RenameSprintDialogProps) {
  const [name, setName] = useState(sprint.name);
  const rename = useRenameSprint(sprint.projectId);

  useEffect(() => {
    if (open) setName(sprint.name);
  }, [open, sprint.name]);

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    rename.mutate(
      { sprintId: sprint.id, name: trimmed },
      {
        onSuccess: () => {
          toast({ title: 'Sprint renamed' });
          onOpenChange(false);
        },
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not rename sprint',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename sprint</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="sprint-name">Sprint name</Label>
          <Input id="sprint-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={rename.isPending || !name.trim()}>
            {rename.isPending ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
