'use client';

import { useState } from 'react';
import { Pencil, Check, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useUpdateBaAssignment } from '@/features/ba-review/api';

export function BaAssignmentField({ storyId, assignedBaEmail }: { storyId: string; assignedBaEmail: string | null }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(assignedBaEmail ?? '');
  const update = useUpdateBaAssignment(storyId);

  const onSave = () =>
    update.mutate(value.trim() || null, {
      onSuccess: () => {
        setEditing(false);
        toast({ title: 'Assigned BA updated' });
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not update assignment',
          description: error instanceof ApiError ? error.message : undefined,
        }),
    });

  if (!editing) {
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Assigned BA: <span className="font-medium text-foreground">{assignedBaEmail ?? 'Not set'}</span>
        </span>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="ba@company.com"
        className="h-8"
      />
      <Button size="sm" variant="ghost" onClick={onSave} disabled={update.isPending}>
        <Check className="h-4 w-4" />
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
