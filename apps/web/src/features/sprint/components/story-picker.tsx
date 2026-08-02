'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Story } from '@sprintguard/shared';

interface StoryPickerProps {
  stories: Pick<Story, 'id' | 'title'>[];
  value: string | null;
  onChange: (storyId: string) => void;
  className?: string;
}

// First single-story-select control in the app (every other per-story page -- Requirements, Test
// Generator, Executions, Automation -- renders every story as its own card instead). Coverage
// needs single-story scoping specifically (§3: "must analyze the selected User Story only"), so
// this is a standalone component rather than a pattern retrofitted onto those other pages.
export function StoryPicker({ stories, value, onChange, className }: StoryPickerProps) {
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className={className ?? 'w-full sm:w-96'}>
        <SelectValue placeholder="Select a user story…" />
      </SelectTrigger>
      <SelectContent>
        {stories.map((story) => (
          <SelectItem key={story.id} value={story.id}>
            {story.title}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
