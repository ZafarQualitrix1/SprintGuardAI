'use client';

import { useState } from 'react';
import { UserPlus, Users } from 'lucide-react';
import { ASSIGNABLE_ROLE_KEYS, type OrganizationMember } from '@sprintguard/shared';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';
import {
  useChangeMemberRole,
  useInvitations,
  useOrganizationMembers,
  useRemoveMember,
  useRevokeInvitation,
} from '@/features/organization/api';
import { InviteMemberDialog } from './invite-member-dialog';

export function TeamPanel() {
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data: members, isLoading: membersLoading } = useOrganizationMembers();
  const { data: invitations, isLoading: invitationsLoading } = useInvitations();
  const changeRole = useChangeMemberRole();
  const removeMember = useRemoveMember();
  const revokeInvitation = useRevokeInvitation();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const columns: DataTableColumn<OrganizationMember>[] = [
    { key: 'fullName', header: 'Name', render: (m) => m.fullName, sortValue: (m) => m.fullName },
    { key: 'email', header: 'Email', render: (m) => m.email, sortValue: (m) => m.email },
    {
      key: 'role',
      header: 'Role',
      render: (m) => (
        <Select
          value={m.roleKey}
          onValueChange={(roleKey) =>
            changeRole.mutate(
              { userId: m.userId, roleKey },
              {
                onError: (error) =>
                  toast({
                    variant: 'destructive',
                    title: 'Could not change role',
                    description: error instanceof ApiError ? error.message : 'Something went wrong.',
                  }),
              },
            )
          }
          disabled={m.userId === currentUserId}
        >
          <SelectTrigger className="h-8 w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[...new Set([m.roleKey, ...ASSIGNABLE_ROLE_KEYS])].map((role) => (
              <SelectItem key={role} value={role}>
                {role.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => <Badge variant={m.isActive ? 'success' : 'outline'}>{m.isActive ? 'Active' : 'Suspended'}</Badge>,
    },
    {
      key: 'lastLoginAt',
      header: 'Last login',
      render: (m) => (m.lastLoginAt ? new Date(m.lastLoginAt).toLocaleString() : 'Never'),
      sortValue: (m) => m.lastLoginAt ?? '',
    },
    {
      key: 'actions',
      header: '',
      render: (m) =>
        m.userId === currentUserId ? null : (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm(`Remove ${m.fullName} from this organization?`)) {
                removeMember.mutate(m.userId, {
                  onError: (error) =>
                    toast({
                      variant: 'destructive',
                      title: 'Could not remove member',
                      description: error instanceof ApiError ? error.message : 'Something went wrong.',
                    }),
                });
              }
            }}
          >
            Remove
          </Button>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Organization Members</CardTitle>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" /> Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            rows={members ?? []}
            rowKey={(m) => m.membershipId}
            isLoading={membersLoading}
            emptyDescription="No members yet."
          />
        </CardContent>
      </Card>

      {invitations && invitations.filter((i) => i.status === 'PENDING').length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {invitations
              .filter((i) => i.status === 'PENDING')
              .map((invitation) => (
                <div key={invitation.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <p>{invitation.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {invitation.roleKey.replace(/_/g, ' ')} · expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      revokeInvitation.mutate(invitation.id, {
                        onSuccess: () => toast({ title: 'Invitation revoked' }),
                      })
                    }
                  >
                    Revoke
                  </Button>
                </div>
              ))}
          </CardContent>
        </Card>
      ) : invitationsLoading ? null : (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> No pending invitations.
        </p>
      )}

      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
