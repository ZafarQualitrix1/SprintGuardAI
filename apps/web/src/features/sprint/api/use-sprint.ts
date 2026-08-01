'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, sprintsApi } from './sprint.api';

export function useProjects() {
  return useQuery({ queryKey: ['sprint', 'projects'], queryFn: projectsApi.list });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprint', 'projects'] }),
  });
}

export function useSprints(projectId: string | undefined) {
  return useQuery({
    queryKey: ['sprint', 'list', projectId],
    queryFn: () => sprintsApi.listByProject(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useSprint(sprintId: string) {
  return useQuery({
    queryKey: ['sprint', 'detail', sprintId],
    queryFn: () => sprintsApi.get(sprintId),
    enabled: Boolean(sprintId),
  });
}

export function useImportJiraSprint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sprintsApi.importFromJira,
    onSuccess: (sprint) => {
      queryClient.invalidateQueries({ queryKey: ['sprint', 'list', sprint.projectId] });
    },
  });
}
