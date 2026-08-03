import type {
  AdminDashboardSummary,
  AdminUserSummary,
  AuditLogEntry,
  FeatureFlag,
  ListAuditLogsParams,
  ListAuditLogsResult,
  QueueName,
  QueueOverview,
  ResetUserPasswordResult,
  RolesAndPermissions,
  UpdateUserInput,
} from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

// Thin wrappers over apiClient, one per backend endpoint. Components never call apiClient directly.
export const adminApi = {
  getDashboardSummary: () => apiClient.get<AdminDashboardSummary>('/admin/dashboard-summary'),

  listUsers: (params: { search?: string; roleKey?: string; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.roleKey) query.set('roleKey', params.roleKey);
    if (params.isActive !== undefined) query.set('isActive', String(params.isActive));
    const qs = query.toString();
    return apiClient.get<AdminUserSummary[]>(`/admin/users${qs ? `?${qs}` : ''}`);
  },
  updateUser: (id: string, input: UpdateUserInput) => apiClient.patch<{ id: string; fullName: string }>(`/admin/users/${id}`, input),
  suspendUser: (id: string) => apiClient.post<{ id: string; isActive: boolean }>(`/admin/users/${id}/suspend`),
  activateUser: (id: string) => apiClient.post<{ id: string; isActive: boolean }>(`/admin/users/${id}/activate`),
  resetUserPassword: (id: string) => apiClient.post<ResetUserPasswordResult>(`/admin/users/${id}/reset-password`),
  forceLogoutUser: (id: string) => apiClient.post<void>(`/admin/users/${id}/force-logout`),
  deleteUser: (id: string) => apiClient.delete<void>(`/admin/users/${id}`),

  listAuditLogs: (params: ListAuditLogsParams) => {
    const query = new URLSearchParams();
    if (params.actorId) query.set('actorId', params.actorId);
    if (params.action) query.set('action', params.action);
    if (params.targetType) query.set('targetType', params.targetType);
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    if (params.page) query.set('page', String(params.page));
    if (params.pageSize) query.set('pageSize', String(params.pageSize));
    const qs = query.toString();
    return apiClient.get<ListAuditLogsResult>(`/audit-log${qs ? `?${qs}` : ''}`);
  },
  // CSV, not JSON -- apiClient always parses JSON, so this bypasses it with a manual authenticated
  // fetch and returns the raw text for the caller to turn into a downloadable Blob.
  exportAuditLogsCsv: async (params: ListAuditLogsParams): Promise<string> => {
    const query = new URLSearchParams();
    if (params.actorId) query.set('actorId', params.actorId);
    if (params.action) query.set('action', params.action);
    if (params.targetType) query.set('targetType', params.targetType);
    if (params.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params.dateTo) query.set('dateTo', params.dateTo);
    const { accessToken } = useAuthStore.getState();
    const response = await fetch(`${API_BASE_URL}/audit-log/export?${query.toString()}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Could not export audit logs');
    }
    return response.text();
  },

  listFeatureFlags: () => apiClient.get<FeatureFlag[]>('/feature-flags'),
  setFeatureFlag: (key: string, isEnabled: boolean, description?: string) =>
    apiClient.patch<FeatureFlag>(`/feature-flags/${key}`, { isEnabled, description }),
  setFeatureFlagOverride: (key: string, isEnabled: boolean, rolloutPercentage = 100) =>
    apiClient.post<FeatureFlag>(`/feature-flags/${key}/overrides`, { isEnabled, rolloutPercentage }),
  removeFeatureFlagOverride: (key: string) => apiClient.delete<FeatureFlag>(`/feature-flags/${key}/overrides`),

  getBackgroundJobsOverview: () => apiClient.get<QueueOverview[]>('/background-jobs'),
  retryJob: (queue: QueueName, jobId: string) => apiClient.post<{ retried: true }>(`/background-jobs/${queue}/${jobId}/retry`),
  removeJob: (queue: QueueName, jobId: string) => apiClient.delete<void>(`/background-jobs/${queue}/${jobId}`),
  pauseQueue: (queue: QueueName) => apiClient.post<{ paused: true }>(`/background-jobs/${queue}/pause`),
  resumeQueue: (queue: QueueName) => apiClient.post<{ resumed: true }>(`/background-jobs/${queue}/resume`),

  listRoles: () => apiClient.get<RolesAndPermissions>('/admin/roles'),
  setRolePermission: (roleKey: string, permissionKey: string, granted: boolean) =>
    apiClient.patch<{ roleKey: string; permissions: string[] }>(
      `/admin/roles/${roleKey}/permissions/${permissionKey}`,
      { granted },
    ),
};

export type { AuditLogEntry };
