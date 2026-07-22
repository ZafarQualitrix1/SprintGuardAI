import type { Project, Sprint, Story } from '@sprintguard/database';
import { ProjectEntity } from '../../domain/entities/project.entity';
import { SprintEntity } from '../../domain/entities/sprint.entity';
import { StoryEntity } from '../../domain/entities/story.entity';

export function toProjectEntity(row: Project): ProjectEntity {
  return new ProjectEntity(row.id, row.organizationId, row.key, row.name, row.description);
}

export function toSprintEntity(row: Sprint): SprintEntity {
  return new SprintEntity(
    row.id,
    row.projectId,
    row.externalId,
    row.name,
    row.goal,
    row.status,
    row.source,
    row.startDate,
    row.endDate,
  );
}

export function toStoryEntity(row: Story): StoryEntity {
  return new StoryEntity(
    row.id,
    row.sprintId,
    row.externalId,
    row.title,
    row.description,
    row.storyPoints,
    row.status,
    row.priority,
    row.assignee,
  );
}
