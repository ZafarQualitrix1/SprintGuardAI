'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi, sprintsApi } from './sprint.api';

export function useProjects() {
  return useQuery({ queryKey: ['sprint', 'projects'], queryFn: projectsApi.list });
}

// Backs the Sprint Dashboard page: one request for every project + its sprints together, instead
// of useProjects() plus one useSprints(project.id) per project card.
export function useProjectsWithSprints() {
  return useQuery({ queryKey: ['sprint', 'projects-with-sprints'], queryFn: projectsApi.listWithSprints });
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
      queryClient.invalidateQueries({ queryKey: ['sprint', 'projects-with-sprints'] });
    },
  });
}

function invalidateSprint(queryClient: ReturnType<typeof useQueryClient>, projectId: string, sprintId: string) {
  queryClient.invalidateQueries({ queryKey: ['sprint', 'list', projectId] });
  queryClient.invalidateQueries({ queryKey: ['sprint', 'detail', sprintId] });
  queryClient.invalidateQueries({ queryKey: ['sprint', 'projects-with-sprints'] });
}

export function useSyncSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => sprintsApi.sync(sprintId),
    onSuccess: (sprint) => invalidateSprint(queryClient, projectId, sprint.id),
  });
}

export function useOverrideSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => sprintsApi.override(sprintId),
    onSuccess: (sprint) => invalidateSprint(queryClient, projectId, sprint.id),
  });
}

export function useRenameSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, name }: { sprintId: string; name: string }) => sprintsApi.rename(sprintId, name),
    onSuccess: (sprint) => invalidateSprint(queryClient, projectId, sprint.id),
  });
}

export function useArchiveSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sprintId, archived }: { sprintId: string; archived: boolean }) =>
      sprintsApi.setArchived(sprintId, archived),
    onSuccess: (sprint) => invalidateSprint(queryClient, projectId, sprint.id),
  });
}

export function useDeleteSprint(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sprintId: string) => sprintsApi.remove(sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprint', 'list', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprint', 'projects-with-sprints'] });
    },
  });
}

export function useSprintSyncHistory(sprintId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['sprint', 'sync-history', sprintId],
    queryFn: () => sprintsApi.syncHistory(sprintId),
    enabled,
  });
}
