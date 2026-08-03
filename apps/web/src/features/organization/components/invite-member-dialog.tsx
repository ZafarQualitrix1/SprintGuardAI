'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { ASSIGNABLE_ROLE_KEYS, inviteMemberSchema, type InviteMemberInput } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useInviteMember } from '@/features/organization/api';

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const invite = useInviteMember();
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<InviteMemberInput>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { roleKey: 'QA_ENGINEER' },
  });

  const onSubmit = handleSubmit((values) => {
    invite.mutate(values, {
      onSuccess: (result) => {
        setInviteLink(`${window.location.origin}/accept-invitation?token=${result.token}`);
        toast({ title: 'Invitation created', description: values.email });
      },
      onError: (error) =>
        toast({
          variant: 'destructive',
          title: 'Could not create invitation',
          description: error instanceof ApiError ? error.message : 'Something went wrong.',
        }),
    });
  });

  const handleClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      reset();
      setInviteLink(null);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite member</DialogTitle>
          <DialogDescription>
            No email delivery is configured yet -- copy the generated link and share it with the invitee directly.
          </DialogDescription>
        </DialogHeader>
        {inviteLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invite link (shown once)</Label>
              <Input readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast({ title: 'Copied to clipboard' });
                }}
              >
                Copy link
              </Button>
              <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input id="email" type="email" placeholder="jane@acme.com" {...register('email')} />
              {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={watch('roleKey')} onValueChange={(value) => setValue('roleKey', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLE_KEYS.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? 'Sending…' : 'Create invitation'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
