'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InviteMemberInput, OrganizationSettingsBackup, UpsertOrganizationSettingsInput } from '@sprintguard/shared';
import { organizationApi } from './organization.api';

const SETTINGS_KEY = ['organization', 'settings'];
const BRANDING_KEY = ['organization', 'branding'];
const MEMBERS_KEY = ['organization', 'members'];
const INVITATIONS_KEY = ['organization', 'invitations'];

export function useOrganizationSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: organizationApi.get });
}

export function useOrganizationBranding() {
  return useQuery({ queryKey: BRANDING_KEY, queryFn: organizationApi.getBranding });
}

export function useUpsertOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpsertOrganizationSettingsInput) => organizationApi.upsert(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useExportOrganizationSettings() {
  return useMutation({ mutationFn: organizationApi.export });
}

export function useImportOrganizationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (backup: OrganizationSettingsBackup) => organizationApi.import(backup),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SETTINGS_KEY }),
  });
}

export function useSendTestNotification() {
  return useMutation({ mutationFn: (channel: 'slack' | 'teams') => organizationApi.sendTestNotification(channel) });
}

// Two-step signed-upload-URL flow: get a signed URL, PUT the file to storage directly, then
// confirm so the backend writes TenantBranding.logoUrl.
export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const extension = file.name.split('.').pop() ?? 'png';
      const { path, signedUrl } = await organizationApi.generateLogoUploadUrl(file.type, file.size, extension);
      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!uploadResponse.ok) {
        throw new Error('Upload to storage failed');
      }
      return organizationApi.confirmLogoUpload(path);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BRANDING_KEY }),
  });
}

export function useOrganizationMembers() {
  return useQuery({ queryKey: MEMBERS_KEY, queryFn: organizationApi.listMembers });
}

export function useChangeMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, roleKey }: { userId: string; roleKey: string }) =>
      organizationApi.changeMemberRole(userId, roleKey),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => organizationApi.removeMember(userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MEMBERS_KEY }),
  });
}

export function useInvitations() {
  return useQuery({ queryKey: INVITATIONS_KEY, queryFn: organizationApi.listInvitations });
}

export function useInviteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: InviteMemberInput) => organizationApi.invite(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY }),
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => organizationApi.revokeInvitation(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITATIONS_KEY }),
  });
}
