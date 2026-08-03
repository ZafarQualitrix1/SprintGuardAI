'use client';

import { useEffect, useState } from 'react';
import type { AdminUserSummary } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useRoles, useUpdateUser } from '@/features/admin/api';

interface ChangeRoleDialogProps {
  user: AdminUserSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeRoleDialog({ user, open, onOpenChange }: ChangeRoleDialogProps) {
  const { data: rolesData, isLoading: rolesLoading } = useRoles();
  const updateUser = useUpdateUser();
  const [roleId, setRoleId] = useState<string>('');

  useEffect(() => {
    if (open && user && rolesData) {
      setRoleId(rolesData.roles.find((r) => r.key === user.roleKey)?.id ?? '');
    }
  }, [open, user, rolesData]);

  if (!user) return null;

  const currentRoleId = rolesData?.roles.find((r) => r.key === user.roleKey)?.id;

  const onSave = () => {
    if (!roleId) return;
    updateUser.mutate(
      { id: user.id, input: { roleId } },
      {
        onSuccess: () => {
          toast({ title: 'Role updated', description: `${user.fullName} is now ${rolesData?.roles.find((r) => r.id === roleId)?.name ?? 'updated'}.` });
          onOpenChange(false);
        },
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not update role',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role</DialogTitle>
          <DialogDescription>
            {user.fullName} ({user.email}) — currently {user.roleName}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select value={roleId} onValueChange={setRoleId} disabled={rolesLoading}>
            <SelectTrigger id="role">
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              {rolesData?.roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={updateUser.isPending || !roleId || roleId === currentRoleId}>
            {updateUser.isPending ? 'Saving…' : 'Save role'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
