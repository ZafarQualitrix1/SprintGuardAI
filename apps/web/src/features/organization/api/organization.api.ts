import type {
  UploadOrganizationLogoResult,
  Invitation,
  InviteMemberInput,
  InviteMemberResult,
  OrganizationBranding,
  OrganizationMember,
  OrganizationSettings,
  OrganizationSettingsBackup,
  SendTestNotificationResult,
  UpsertOrganizationSettingsInput,
} from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

// Thin wrappers over apiClient, one per backend endpoint. Components never call apiClient directly.
export const organizationApi = {
  get: () => apiClient.get<OrganizationSettings>('/organization-settings'),
  getBranding: () => apiClient.get<OrganizationBranding>('/organization-settings/branding'),
  upsert: (input: UpsertOrganizationSettingsInput) =>
    apiClient.patch<OrganizationSettings>('/organization-settings', input),
  export: () => apiClient.get<OrganizationSettingsBackup>('/organization-settings/export'),
  import: (backup: OrganizationSettingsBackup) =>
    apiClient.post<OrganizationSettings>('/organization-settings/import', backup),

  uploadLogo: (contentType: string, data: string) =>
    apiClient.post<UploadOrganizationLogoResult>('/organization-settings/logo', { contentType, data }),

  sendTestNotification: (channel: 'slack' | 'teams') =>
    apiClient.post<SendTestNotificationResult>(`/organization-settings/notifications/test/${channel}`),

  listMembers: () => apiClient.get<OrganizationMember[]>('/organization-settings/members'),
  changeMemberRole: (userId: string, roleKey: string) =>
    apiClient.patch<OrganizationMember>(`/organization-settings/members/${userId}/role`, { roleKey }),
  removeMember: (userId: string) => apiClient.delete<void>(`/organization-settings/members/${userId}`),

  listInvitations: () => apiClient.get<Invitation[]>('/organization-settings/invitations'),
  invite: (input: InviteMemberInput) =>
    apiClient.post<InviteMemberResult>('/organization-settings/invitations', input),
  revokeInvitation: (id: string) => apiClient.delete<void>(`/organization-settings/invitations/${id}`),
};
