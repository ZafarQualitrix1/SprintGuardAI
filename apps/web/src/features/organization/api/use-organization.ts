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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result is a "data:<mime>;base64,<data>" URL -- the backend stores it as-is with
      // its own contentType field, so only the part after the comma is sent.
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read file'));
    reader.readAsDataURL(file);
  });
}

// Logos are stored inline (TenantBranding.logoUrl as a data: URL) rather than in external object
// storage, so upload is a single request: base64-encode the file, POST it, done.
export function useUploadLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      const data = await fileToBase64(file);
      return organizationApi.uploadLogo(file.type, data);
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
