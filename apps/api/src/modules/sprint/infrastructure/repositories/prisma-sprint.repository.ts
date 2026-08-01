import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  CreateSprintWithStoriesInput,
  ISprintRepository,
} from '../../domain/repositories/sprint.repository.interface';
import { SprintWithStories } from '../../domain/entities/sprint.entity';
import { toSprintEntity, toStoryEntity } from '../mappers';

@Injectable()
export class PrismaSprintRepository implements ISprintRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createWithStories(input: CreateSprintWithStoriesInput): Promise<SprintWithStories> {
    const { sprint, stories } = await this.prisma.$transaction(async (tx) => {
      const sprint = await tx.sprint.create({
        data: {
          projectId: input.projectId,
          externalId: input.externalId,
          name: input.name,
          goal: input.goal,
          source: input.source,
          status: 'ACTIVE',
          startDate: input.startDate,
          endDate: input.endDate,
          sourceConnectionId: input.sourceConnectionId ?? null,
        },
      });

      const stories = await Promise.all(
        input.stories.map((story) =>
          tx.story.create({
            data: {
              sprintId: sprint.id,
              externalId: story.externalId,
              title: story.title,
              description: story.description,
              storyPoints: story.storyPoints,
              status: story.status,
              priority: story.priority,
              assignee: story.assignee,
              source: input.source,
            },
          }),
        ),
      );

      return { sprint, stories };
    });

    return new SprintWithStories(toSprintEntity(sprint), stories.map(toStoryEntity));
  }

  async findByIdWithStories(id: string, organizationId: string): Promise<SprintWithStories | null> {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, project: { organizationId } },
      include: { stories: { orderBy: { createdAt: 'asc' } } },
    });
    if (!sprint) {
      return null;
    }
    return new SprintWithStories(toSprintEntity(sprint), sprint.stories.map(toStoryEntity));
  }

  async listByProject(projectId: string, organizationId: string) {
    const rows = await this.prisma.sprint.findMany({
      where: { projectId, project: { organizationId } },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toSprintEntity);
  }
}
