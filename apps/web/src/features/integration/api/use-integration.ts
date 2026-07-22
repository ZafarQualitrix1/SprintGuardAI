'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { integrationApi } from './integration.api';

export function useIntegrationConnections() {
  return useQuery({
    queryKey: ['integrations', 'connections'],
    queryFn: integrationApi.list,
  });
}

export function useConnectJira() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: integrationApi.connectJira,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['integrations', 'connections'] }),
  });
}
