'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ListAuditLogsParams, QueueName, UpdateUserInput } from '@sprintguard/shared';
import { adminApi } from './admin.api';

const DASHBOARD_KEY = ['admin', 'dashboard-summary'];
const USERS_KEY = ['admin', 'users'];
const FEATURE_FLAGS_KEY = ['admin', 'feature-flags'];
const BACKGROUND_JOBS_KEY = ['admin', 'background-jobs'];

export function useAdminDashboardSummary() {
  return useQuery({ queryKey: DASHBOARD_KEY, queryFn: adminApi.getDashboardSummary });
}

export function useAdminUsers(params: { search?: string; roleKey?: string; isActive?: boolean }) {
  return useQuery({ queryKey: [...USERS_KEY, params], queryFn: () => adminApi.listUsers(params) });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateUserInput }) => adminApi.updateUser(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.suspendUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useActivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.activateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useResetUserPassword() {
  return useMutation({ mutationFn: adminApi.resetUserPassword });
}

export function useForceLogoutUser() {
  return useMutation({ mutationFn: adminApi.forceLogoutUser });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.deleteUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_KEY }),
  });
}

export function useAuditLogs(params: ListAuditLogsParams) {
  return useQuery({ queryKey: ['admin', 'audit-logs', params], queryFn: () => adminApi.listAuditLogs(params) });
}

export function useExportAuditLogs() {
  return useMutation({ mutationFn: (params: ListAuditLogsParams) => adminApi.exportAuditLogsCsv(params) });
}

export function useFeatureFlags() {
  return useQuery({ queryKey: FEATURE_FLAGS_KEY, queryFn: adminApi.listFeatureFlags });
}

export function useSetFeatureFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, isEnabled }: { key: string; isEnabled: boolean }) => adminApi.setFeatureFlag(key, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_KEY }),
  });
}

export function useSetFeatureFlagOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, isEnabled }: { key: string; isEnabled: boolean }) => adminApi.setFeatureFlagOverride(key, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_KEY }),
  });
}

export function useRemoveFeatureFlagOverride() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => adminApi.removeFeatureFlagOverride(key),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: FEATURE_FLAGS_KEY }),
  });
}

export function useBackgroundJobsOverview() {
  return useQuery({ queryKey: BACKGROUND_JOBS_KEY, queryFn: adminApi.getBackgroundJobsOverview, refetchInterval: 15000 });
}

export function useRetryJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: QueueName; jobId: string }) => adminApi.retryJob(queue, jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BACKGROUND_JOBS_KEY }),
  });
}

export function useRemoveJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ queue, jobId }: { queue: QueueName; jobId: string }) => adminApi.removeJob(queue, jobId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BACKGROUND_JOBS_KEY }),
  });
}

export function usePauseQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queue: QueueName) => adminApi.pauseQueue(queue),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BACKGROUND_JOBS_KEY }),
  });
}

export function useResumeQueue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (queue: QueueName) => adminApi.resumeQueue(queue),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BACKGROUND_JOBS_KEY }),
  });
}

const ROLES_KEY = ['admin', 'roles'];

export function useRoles() {
  return useQuery({ queryKey: ROLES_KEY, queryFn: adminApi.listRoles });
}

export function useSetRolePermission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roleKey, permissionKey, granted }: { roleKey: string; permissionKey: string; granted: boolean }) =>
      adminApi.setRolePermission(roleKey, permissionKey, granted),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ROLES_KEY }),
  });
}
