'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { useProjects, useSprint, useSprints } from '@/features/sprint/api';

interface ApiAutomationFiltersProps {
  projectId: string | null;
  onProjectChange: (projectId: string | null) => void;
  sprintId: string | null;
  onSprintChange: (sprintId: string | null) => void;
  storyIds: string[];
  onStoryIdsChange: (storyIds: string[]) => void;
}

// Project -> Sprint -> User Story filter cascade. No story selected + a sprint chosen means "entire
// sprint" (the backend treats an absent storyIds filter as no story restriction) -- so "Single User
// Story / Multiple User Stories / Entire Sprint" from the spec all fall out of one multi-select
// with zero extra mode-toggle state.
export function ApiAutomationFilters({
  projectId,
  onProjectChange,
  sprintId,
  onSprintChange,
  storyIds,
  onStoryIdsChange,
}: ApiAutomationFiltersProps) {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const { data: sprints, isLoading: sprintsLoading } = useSprints(projectId ?? undefined);
  const { data: sprint, isLoading: storiesLoading } = useSprint(sprintId ?? '');

  const onProjectSelect = (value: string) => {
    onProjectChange(value);
    onSprintChange(null);
    onStoryIdsChange([]);
  };

  const onSprintSelect = (value: string) => {
    onSprintChange(value);
    onStoryIdsChange([]);
  };

  const toggleStory = (storyId: string) => {
    onStoryIdsChange(storyIds.includes(storyId) ? storyIds.filter((id) => id !== storyId) : [...storyIds, storyId]);
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Project</label>
        {projectsLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select value={projectId ?? undefined} onValueChange={onProjectSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Select a project…" />
            </SelectTrigger>
            <SelectContent>
              {(projects ?? []).map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Sprint</label>
        {sprintsLoading && projectId ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <Select value={sprintId ?? undefined} onValueChange={onSprintSelect} disabled={!projectId}>
            <SelectTrigger>
              <SelectValue placeholder={projectId ? 'All sprints' : 'Select a project first'} />
            </SelectTrigger>
            <SelectContent>
              {(sprints ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">
          User Story {storyIds.length > 0 ? `(${storyIds.length} selected)` : '(entire sprint)'}
        </label>
        {!sprintId ? (
          <div className="flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">
            Select a sprint first
          </div>
        ) : storiesLoading ? (
          <Skeleton className="h-9 w-full" />
        ) : (
          <div className="max-h-48 overflow-y-auto rounded-md border">
            {(sprint?.stories ?? []).map((story) => (
              <label
                key={story.id}
                className="flex cursor-pointer items-center gap-2 border-b px-3 py-1.5 text-sm last:border-b-0 hover:bg-muted"
              >
                <Checkbox checked={storyIds.includes(story.id)} onCheckedChange={() => toggleStory(story.id)} />
                <span className="truncate">{story.title}</span>
              </label>
            ))}
            {sprint && sprint.stories.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No stories in this sprint.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
