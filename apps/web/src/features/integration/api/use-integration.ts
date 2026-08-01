'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationApi } from './integration.api';

const CONNECTIONS_KEY = ['integrations', 'connections'];

export function useIntegrationConnections() {
  return useQuery({
    queryKey: CONNECTIONS_KEY,
    queryFn: integrationApi.list,
  });
}

export function useConnectJira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationApi.connectJira,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY }),
  });
}

// Pre-save, non-persisting check -- doesn't touch the connections cache.
export function useVerifyJira() {
  return useMutation({ mutationFn: integrationApi.verifyJira });
}

export function useUpdateConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof integrationApi.update>[1] }) =>
      integrationApi.update(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY }),
  });
}

export function useDisconnectConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationApi.disconnect,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY }),
  });
}

export function useDeleteConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationApi.deletePermanently,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY }),
  });
}

export function useSetDefaultConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationApi.setDefault,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY }),
  });
}

// Post-save health check (card action) -- distinct from useVerifyJira (pre-save, in the dialog).
export function useTestConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationApi.test,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY }),
  });
}

export function useSyncConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationApi.sync,
    onSuccess: (_result, connectionId) => {
      queryClient.invalidateQueries({ queryKey: CONNECTIONS_KEY });
      queryClient.invalidateQueries({ queryKey: ['integrations', 'projects', connectionId] });
    },
  });
}

export function useExternalProjects(connectionId: string | undefined) {
  return useQuery({
    queryKey: ['integrations', 'projects', connectionId],
    queryFn: () => integrationApi.fetchProjects(connectionId!),
    enabled: Boolean(connectionId),
  });
}

export function useExternalBoards(connectionId: string | undefined, projectKey: string | undefined) {
  return useQuery({
    queryKey: ['integrations', 'boards', connectionId, projectKey],
    queryFn: () => integrationApi.fetchBoards(connectionId!, projectKey!),
    enabled: Boolean(connectionId) && Boolean(projectKey),
  });
}

export function useExternalSprints(connectionId: string | undefined, boardId: string | undefined) {
  return useQuery({
    queryKey: ['integrations', 'sprints', connectionId, boardId],
    queryFn: () => integrationApi.fetchSprints(connectionId!, boardId!),
    enabled: Boolean(connectionId) && Boolean(boardId),
  });
}
