import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  ISprintRepository,
  RecordSyncEventInput,
  SprintSyncResult,
  UpsertSprintWithStoriesInput,
} from '../../domain/repositories/sprint.repository.interface';
import { SprintEntity, SprintSyncEventEntity, SprintWithStories } from '../../domain/entities/sprint.entity';
import { toSprintEntity, toSprintSyncEventEntity, toStoryEntity } from '../mappers';

@Injectable()
export class PrismaSprintRepository implements ISprintRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertWithStories(input: UpsertSprintWithStoriesInput): Promise<SprintSyncResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      const existingSprint = input.externalId
        ? await tx.sprint.findUnique({
            where: { projectId_externalId: { projectId: input.projectId, externalId: input.externalId } },
          })
        : null;

      const sprint = existingSprint
        ? await tx.sprint.update({
            where: { id: existingSprint.id },
            data: {
              name: input.name,
              goal: input.goal,
              startDate: input.startDate,
              endDate: input.endDate,
              sourceConnectionId: input.sourceConnectionId ?? existingSprint.sourceConnectionId,
              lastSyncedAt: new Date(),
            },
          })
        : await tx.sprint.create({
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
              lastSyncedAt: new Date(),
            },
          });

      let storiesCreated = 0;
      let storiesUpdated = 0;
      const stories = [];

      for (const story of input.stories) {
        if (story.externalId) {
          const existingStory = await tx.story.findUnique({
            where: { sprintId_externalId: { sprintId: sprint.id, externalId: story.externalId } },
            select: { id: true },
          });
          const row = await tx.story.upsert({
            where: { sprintId_externalId: { sprintId: sprint.id, externalId: story.externalId } },
            create: {
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
            update: {
              title: story.title,
              description: story.description,
              storyPoints: story.storyPoints,
              status: story.status,
              priority: story.priority,
              assignee: story.assignee,
            },
          });
          stories.push(row);
          if (existingStory) storiesUpdated += 1;
          else storiesCreated += 1;
        } else {
          const row = await tx.story.create({
            data: {
              sprintId: sprint.id,
              externalId: null,
              title: story.title,
              description: story.description,
              storyPoints: story.storyPoints,
              status: story.status,
              priority: story.priority,
              assignee: story.assignee,
              source: input.source,
            },
          });
          stories.push(row);
          storiesCreated += 1;
        }
      }

      return { sprint, stories, storiesCreated, storiesUpdated, wasNewSprint: !existingSprint };
    });

    return {
      sprintWithStories: new SprintWithStories(toSprintEntity(result.sprint), result.stories.map(toStoryEntity)),
      storiesCreated: result.storiesCreated,
      storiesUpdated: result.storiesUpdated,
      wasNewSprint: result.wasNewSprint,
    };
  }

  async overrideWithStories(sprintId: string, input: UpsertSprintWithStoriesInput): Promise<SprintSyncResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      // Cascades away every Requirement/TestScenario/TestCase/CoverageMatrixEntry/Execution/
      // Defect/RequirementAnalysisReport tied to these stories -- this IS the "complete refresh"
      // the user explicitly confirmed via Override, unlike the default upsert-based sync.
      await tx.story.deleteMany({ where: { sprintId } });

      const sprint = await tx.sprint.update({
        where: { id: sprintId },
        data: {
          name: input.name,
          goal: input.goal,
          startDate: input.startDate,
          endDate: input.endDate,
          sourceConnectionId: input.sourceConnectionId ?? undefined,
          lastSyncedAt: new Date(),
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

    return {
      sprintWithStories: new SprintWithStories(toSprintEntity(result.sprint), result.stories.map(toStoryEntity)),
      storiesCreated: result.stories.length,
      storiesUpdated: 0,
      wasNewSprint: false,
    };
  }

  async findByIdWithStories(id: string, organizationId: string): Promise<SprintWithStories | null> {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id, project: { organizationId }, deletedAt: null },
      include: { stories: { orderBy: { createdAt: 'asc' } } },
    });
    if (!sprint) {
      return null;
    }
    return new SprintWithStories(toSprintEntity(sprint), sprint.stories.map(toStoryEntity));
  }

  async listByProject(projectId: string, organizationId: string): Promise<SprintEntity[]> {
    const rows = await this.prisma.sprint.findMany({
      where: { projectId, project: { organizationId }, deletedAt: null, archivedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toSprintEntity);
  }

  async rename(id: string, organizationId: string, name: string): Promise<SprintEntity> {
    await this.assertOwned(id, organizationId);
    const updated = await this.prisma.sprint.update({ where: { id }, data: { name } });
    return toSprintEntity(updated);
  }

  async setArchived(id: string, organizationId: string, archived: boolean): Promise<SprintEntity> {
    await this.assertOwned(id, organizationId);
    const updated = await this.prisma.sprint.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
    });
    return toSprintEntity(updated);
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await this.assertOwned(id, organizationId);
    await this.prisma.sprint.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async recordSyncEvent(input: RecordSyncEventInput): Promise<void> {
    await this.prisma.sprintSyncEvent.create({
      data: {
        sprintId: input.sprintId,
        organizationId: input.organizationId,
        action: input.action,
        status: input.status,
        storiesCreated: input.storiesCreated ?? 0,
        storiesUpdated: input.storiesUpdated ?? 0,
        errorMessage: input.errorMessage ?? null,
        triggeredBy: input.triggeredBy ?? null,
      },
    });
  }

  async listSyncEvents(sprintId: string, organizationId: string): Promise<SprintSyncEventEntity[]> {
    await this.assertOwned(sprintId, organizationId);
    const rows = await this.prisma.sprintSyncEvent.findMany({
      where: { sprintId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map(toSprintSyncEventEntity);
  }

  private async assertOwned(id: string, organizationId: string): Promise<void> {
    const existing = await this.prisma.sprint.findFirst({
      where: { id, project: { organizationId }, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException('Sprint not found');
    }
  }
}
